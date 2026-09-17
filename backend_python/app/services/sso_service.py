import base64
import time
import uuid
import urllib.parse
from typing import Dict, Any, List, Optional
from app.db.database import db

class SSOService:
    """
    Enterprise SAML 2.0 and OpenID Connect (OIDC) authentication service.
    Supports Okta, Azure AD (Entra ID), Google Workspace, and generic SAML/OIDC IdPs.
    """

    @staticmethod
    def register_sso_config(
        company_id: str,
        provider_type: str,  # 'saml' or 'oidc'
        idp_name: str,       # 'okta', 'azure_ad', 'google_workspace', 'custom'
        domains: List[str],  # e.g., ['acme.com', 'acme-corp.in']
        issuer: str,
        entrypoint_url: str,
        cert_or_secret: str,
        client_id: Optional[str] = None,
        enabled: bool = True
    ) -> Dict[str, Any]:
        """Registers or updates enterprise SSO configuration for a company tenant."""
        existing = SSOService.get_sso_config(company_id)
        config_id = existing["id"] if existing else f"sso_{uuid.uuid4().hex[:12]}"

        normalized_domains = [d.lower().strip() for d in domains if d.strip()]

        sso_record = {
            "id": config_id,
            "companyId": company_id,
            "providerType": provider_type.lower(),
            "idpName": idp_name.lower(),
            "domains": normalized_domains,
            "issuer": issuer.strip(),
            "entrypointUrl": entrypoint_url.strip(),
            "certOrSecret": cert_or_secret.strip(),
            "clientId": (client_id or "").strip(),
            "enabled": enabled,
            "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }

        # Save to database
        if not hasattr(db, "sso_configs"):
            db.sso_configs = []

        # Upsert
        db.sso_configs = [c for c in db.sso_configs if c.get("companyId") != company_id]
        db.sso_configs.append(sso_record)
        comp = db.get_company_by_id(company_id)
        if comp:
            if "settings" not in comp:
                comp["settings"] = {}
            comp["settings"]["ssoConfig"] = sso_record
            db.save_company(comp)
        return sso_record

    @staticmethod
    def get_sso_config(company_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves tenant SSO configuration."""
        if not hasattr(db, "sso_configs"):
            db.sso_configs = []
        for c in db.sso_configs:
            if c.get("companyId") == company_id:
                return c
        comp = db.get_company_by_id(company_id)
        if comp and comp.get("settings", {}).get("ssoConfig"):
            return comp["settings"]["ssoConfig"]
        return None

    @staticmethod
    def discover_tenant_by_email(email: str) -> Optional[Dict[str, Any]]:
        """
        IdP Discovery / Home Realm Discovery (HRD).
        Extracts domain from user's enterprise email and matches to tenant SSO config.
        """
        if "@" not in email:
            return None
        domain = email.split("@")[1].strip().lower()
        if not hasattr(db, "sso_configs"):
            db.sso_configs = []

        for config in db.sso_configs:
            if config.get("enabled") and domain in config.get("domains", []):
                return config
        return None

    @staticmethod
    def generate_saml_authn_request(company_id: str, relay_state: Optional[str] = None) -> Dict[str, Any]:
        """
        Generates SAML 2.0 AuthnRequest URL and payload for SP-Initiated SSO.
        """
        config = SSOService.get_sso_config(company_id)
        if not config or not config.get("enabled"):
            raise ValueError(f"SSO is not configured or disabled for company {company_id}")

        req_id = f"_saml_{uuid.uuid4().hex}"
        issue_instant = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        acs_url = f"https://app.coarai.com/api/v1/auth/sso/saml/callback?company_id={company_id}"

        # Standard SAML 2.0 AuthnRequest XML structure
        saml_xml = f"""<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="{req_id}"
    Version="2.0"
    IssueInstant="{issue_instant}"
    Destination="{config['entrypointUrl']}"
    AssertionConsumerServiceURL="{acs_url}"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
    <saml:Issuer>https://app.coarai.com/saml/metadata/{company_id}</saml:Issuer>
</samlp:AuthnRequest>"""

        encoded_req = base64.b64encode(saml_xml.encode("utf-8")).decode("utf-8")
        params = {"SAMLRequest": encoded_req}
        if relay_state:
            params["RelayState"] = relay_state

        redirect_url = f"{config['entrypointUrl']}?{urllib.parse.urlencode(params)}"

        return {
            "requestId": req_id,
            "redirectUrl": redirect_url,
            "samlRequestBase64": encoded_req,
            "acsUrl": acs_url
        }

    @staticmethod
    def process_saml_response(company_id: str, saml_response_b64: str) -> Dict[str, Any]:
        """
        Validates SAML 2.0 Response assertion and extracts user identity attributes.
        """
        config = SSOService.get_sso_config(company_id)
        if not config or not config.get("enabled"):
            raise ValueError(f"SSO configuration missing or inactive for company {company_id}")

        try:
            raw_xml = base64.b64decode(saml_response_b64).decode("utf-8")
        except Exception as e:
            raise ValueError(f"Invalid Base64 encoded SAMLResponse: {str(e)}")

        # Verify issuer matching
        if config["issuer"] not in raw_xml:
            raise ValueError(f"SAML Issuer mismatch: expected issuer {config['issuer']}")

        # Extract NameID / Email
        email = None
        first_name = ""
        last_name = ""
        role = "member"

        import re
        name_id_match = re.search(r'<saml:NameID[^>]*>([^<]+)</saml:NameID>', raw_xml)
        if name_id_match:
            email = name_id_match.group(1).strip()
        else:
            email_match = re.search(r'Name="(?:email|emailAddress|http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress)"[^>]*>\s*<saml:AttributeValue[^>]*>([^<]+)</saml:AttributeValue>', raw_xml)
            if email_match:
                email = email_match.group(1).strip()

        if not email or "@" not in email:
            raise ValueError("SAML Assertion does not contain a valid NameID/Email attribute.")

        # Extract Name attributes
        fn_match = re.search(r'Name="(?:firstName|givenName|http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname)"[^>]*>\s*<saml:AttributeValue[^>]*>([^<]+)</saml:AttributeValue>', raw_xml)
        if fn_match:
            first_name = fn_match.group(1).strip()

        ln_match = re.search(r'Name="(?:lastName|surname|http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname)"[^>]*>\s*<saml:AttributeValue[^>]*>([^<]+)</saml:AttributeValue>', raw_xml)
        if ln_match:
            last_name = ln_match.group(1).strip()

        role_match = re.search(r'Name="(?:role|groups|http://schemas.microsoft.com/ws/2008/06/identity/claims/role)"[^>]*>\s*<saml:AttributeValue[^>]*>([^<]+)</saml:AttributeValue>', raw_xml)
        if role_match and "admin" in role_match.group(1).lower():
            role = "admin"

        return {
            "companyId": company_id,
            "email": email.lower(),
            "name": f"{first_name} {last_name}".strip() or email.split("@")[0],
            "role": role,
            "idpProvider": config.get("idpName", "saml"),
            "authenticatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }

    @staticmethod
    def process_oidc_token(company_id: str, id_token_claims: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates OIDC ID Token Claims for enterprise sign-in (Google / Azure AD / Okta).
        """
        config = SSOService.get_sso_config(company_id)
        if not config or not config.get("enabled"):
            raise ValueError(f"SSO configuration missing or inactive for company {company_id}")

        issuer = id_token_claims.get("iss", "")
        if config["issuer"] not in issuer and issuer not in config["issuer"]:
            raise ValueError(f"OIDC Issuer mismatch: token issuer {issuer} does not match config {config['issuer']}")

        if config.get("clientId") and id_token_claims.get("aud") != config["clientId"]:
            raise ValueError(f"OIDC Audience mismatch: token aud {id_token_claims.get('aud')} does not match clientId")

        email = id_token_claims.get("email")
        if not email or "@" not in email:
            raise ValueError("OIDC Token is missing verified email claim.")

        return {
            "companyId": company_id,
            "email": email.lower(),
            "name": id_token_claims.get("name") or email.split("@")[0],
            "role": "admin" if id_token_claims.get("role") == "admin" or "admin" in id_token_claims.get("groups", []) else "member",
            "idpProvider": config.get("idpName", "oidc"),
            "authenticatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
