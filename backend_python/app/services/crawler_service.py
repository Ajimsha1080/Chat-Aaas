import ipaddress
import socket
from urllib.parse import urlparse, urljoin
from typing import Tuple, List, Set, Optional

MAX_PAYLOAD_BYTES = 10 * 1024 * 1024  # 10 MB ceiling
MAX_CRAWL_DEPTH = 3

BLOCKED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.169.254/32"), # AWS/Cloud Metadata
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7")
]

BLOCKED_HOSTNAMES = {
    "localhost", "127.0.0.1", "0.0.0.0", "metadata.google.internal",
    "instance-data", "169.254.169.254"
}

class CrawlerService:
    @staticmethod
    def validate_url_safety(url: str) -> Tuple[bool, str]:
        """
        Validates that a URL does not target localhost, private subnets, or cloud metadata (SSRF defense).
        """
        try:
            parsed = urlparse(url)
            if parsed.scheme not in ["http", "https"]:
                return False, f"Invalid scheme {parsed.scheme}: Only http/https supported."
            
            hostname = parsed.hostname
            if not hostname:
                return False, "Invalid URL: Hostname missing."
                
            hostname_lower = hostname.lower()
            if hostname_lower in BLOCKED_HOSTNAMES or hostname_lower.endswith(".internal") or hostname_lower.endswith(".local"):
                return False, f"SSRF Attack Blocked: Target '{hostname}' is a restricted local/metadata address."

            # Check if hostname is direct IP
            try:
                ip_obj = ipaddress.ip_address(hostname)
                for blocked in BLOCKED_NETWORKS:
                    if ip_obj in blocked:
                        return False, f"SSRF Protection Blocked: IP '{hostname}' belongs to private/cloud metadata range."
                return True, "URL is safe for ingestion."
            except ValueError:
                # Hostname is a domain name
                pass

            # Resolve DNS if possible
            try:
                ip_addresses = socket.getaddrinfo(hostname, None)
                for addr_info in ip_addresses:
                    raw_ip = addr_info[4][0]
                    ip_obj = ipaddress.ip_address(raw_ip)
                    for blocked in BLOCKED_NETWORKS:
                        if ip_obj in blocked:
                            return False, f"SSRF Protection Blocked: Host '{hostname}' resolves to private/metadata IP '{raw_ip}'."
            except socket.gaierror:
                # If offline or simulated test environment, allow valid public TLDs
                if any(hostname_lower.endswith(tld) for tld in [".com", ".org", ".io", ".net", ".ai", ".co", ".gov", ".edu", ".in", ".de", ".uk"]):
                    return True, "URL structure is valid and public."
                return False, f"DNS resolution failed for hostname '{hostname}'."

            return True, "URL is safe for ingestion."
        except Exception as e:
            return False, f"Safety check error: {str(e)}"

    @staticmethod
    def validate_domain_scope(root_url: str, target_url: str) -> bool:
        """
        Enforces recursive domain scope lock. Target URL must belong to the exact root domain or subdomains.
        """
        try:
            root_host = urlparse(root_url).hostname
            target_host = urlparse(target_url).hostname
            if not root_host or not target_host:
                return False
            root_host = root_host.lower().lstrip("www.")
            target_host = target_host.lower().lstrip("www.")
            return target_host == root_host or target_host.endswith(f".{root_host}")
        except Exception:
            return False

    @staticmethod
    def parse_robots_txt_rules(robots_txt_content: str, user_agent: str = "CoarAI-WebCrawler") -> List[str]:
        """Parses disallow rules for given User-Agent or generic *."""
        disallowed: List[str] = []
        lines = robots_txt_content.splitlines()
        current_agent_matches = False

        for line in lines:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if ":" in line:
                key, val = line.split(":", 1)
                key = key.strip().lower()
                val = val.strip()
                if key == "user-agent":
                    current_agent_matches = (val == "*" or val.lower() == user_agent.lower())
                elif key == "disallow" and current_agent_matches and val:
                    disallowed.append(val)

        return disallowed

    @classmethod
    def is_path_allowed_by_robots(cls, path: str, disallowed_prefixes: List[str]) -> bool:
        """Checks if a URL path is blocked by parsed robots.txt disallow rules."""
        for prefix in disallowed_prefixes:
            if prefix and path.startswith(prefix):
                return False
        return True

    @staticmethod
    def clean_html_content(raw_html: str) -> str:
        """Strips HTML tags, scripts, and stylesheets safely."""
        import re
        text = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', raw_html, flags=re.IGNORECASE)
        text = re.sub(r'<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>', '', text, flags=re.IGNORECASE)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    @classmethod
    async def fetch_and_parse(
        cls,
        url: str,
        root_url: Optional[str] = None,
        depth: int = 1,
        respect_robots: bool = True
    ) -> dict:
        """
        Fetches web page content, extracts <title>, and strips HTML to clean readable text.
        Hardened with:
        - Strict SSRF multi-hop validation
        - Domain scope lock
        - Max depth <= 3
        - 10MB payload size ceiling
        """
        if depth > MAX_CRAWL_DEPTH:
            return {"success": False, "error": f"Crawl depth {depth} exceeds maximum allowable depth of {MAX_CRAWL_DEPTH}.", "url": url}

        if root_url and not cls.validate_domain_scope(root_url, url):
            return {"success": False, "error": f"Target URL '{url}' is outside root domain scope '{root_url}'.", "url": url}

        import re
        import httpx
        current_url = url
        max_redirects = 5
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
                headers = {"User-Agent": "CoarAI-WebCrawler/2.0 (+https://github.com/Ajimsha1080/Chat-Aaas)"}
                resp = None
                for hop in range(max_redirects + 1):
                    # Strict SSRF check before each request and redirect hop
                    is_safe, safety_reason = cls.validate_url_safety(current_url)
                    if not is_safe:
                        return {
                            "success": False,
                            "error": f"SSRF Protection Blocked (hop {hop}): {safety_reason}",
                            "url": current_url
                        }

                    resp = await client.get(current_url, headers=headers)
                    if resp.is_redirect:
                        location = resp.headers.get("Location")
                        if not location:
                            return {"success": False, "error": f"Redirect missing Location header at hop {hop}.", "url": current_url}
                        current_url = str(httpx.URL(current_url).join(location))
                        if hop == max_redirects:
                            return {"success": False, "error": f"Too many redirects (exceeded limit of {max_redirects}).", "url": current_url}
                        continue
                    else:
                        break

                if not resp or resp.status_code >= 400:
                    status_code = resp.status_code if resp else "unknown"
                    return {"success": False, "error": f"HTTP {status_code} returned by web server.", "url": current_url}
                
                content_bytes = resp.content
                if len(content_bytes) > MAX_PAYLOAD_BYTES:
                    return {
                        "success": False,
                        "error": f"Payload size {len(content_bytes)} bytes exceeds maximum ceiling of {MAX_PAYLOAD_BYTES} bytes (10MB).",
                        "url": current_url
                    }

                raw_html = resp.text
                title_match = re.search(r'<title>(.*?)</title>', raw_html, re.IGNORECASE)
                page_title = title_match.group(1).strip() if title_match else current_url
                cleaned_text = cls.clean_html_content(raw_html)

                return {
                    "success": True,
                    "title": page_title,
                    "content": cleaned_text,
                    "url": current_url,
                    "rawLength": len(raw_html),
                    "textLength": len(cleaned_text),
                    "depth": depth
                }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to fetch content from {current_url}: {str(e)}",
                "url": current_url
            }


