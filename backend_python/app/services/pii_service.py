import re
from typing import Dict, Any, List, Tuple, Optional

# Indian Aadhaar Verhoeff algorithm lookup tables for validation
_VERHOEFF_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
]
_VERHOEFF_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
]

def _validate_verhoeff(num_str: str) -> bool:
    """Validates 12-digit Indian Aadhaar via Verhoeff checksum."""
    clean = re.sub(r"\D", "", num_str)
    if len(clean) != 12:
        return False
    c = 0
    for i, item in enumerate(reversed(clean)):
        c = _VERHOEFF_D[c][_VERHOEFF_P[i % 8][int(item)]]
    return c == 0

def _validate_luhn(card_num: str) -> bool:
    """Validates payment card number via Luhn algorithm."""
    clean = re.sub(r"\D", "", card_num)
    if not (13 <= len(clean) <= 19):
        return False
    digits = [int(d) for d in clean]
    checksum = 0
    reverse_digits = digits[::-1]
    for i, d in enumerate(reverse_digits):
        if i % 2 == 1:
            doubled = d * 2
            checksum += doubled - 9 if doubled > 9 else doubled
        else:
            checksum += d
    return checksum % 10 == 0

class PIIService:
    """
    DPDPA 2023 compliant Dynamic Data Masking & PII Redaction Service.
    Specially tuned for Indian enterprise SaaS compliance: Aadhaar, PAN, Phone, Card, Email.
    """

    # Compiled regex patterns
    CARD_REGEX = re.compile(r'\b(?:\d{4}[ -]?){3}\d{1,7}\b')
    AADHAAR_REGEX = re.compile(r'(?<!\d)(?:[2-9]\d{3}[ -]\d{4}[ -]\d{4}|[2-9]\d{11})(?!\d)')
    PAN_REGEX = re.compile(r'\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b', re.IGNORECASE)
    INDIAN_PHONE_REGEX = re.compile(r'(?:\+91[\-\s]?|91[\-\s]?|0)?[6-9]\d{4}[\-\s]?\d{5}\b')
    EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')

    @classmethod
    def redact_text(
        cls,
        text: str,
        mask_types: Optional[List[str]] = None
    ) -> Tuple[str, Dict[str, int]]:
        """
        Redacts all sensitive Indian and Global PII from the input string.
        Returns: (sanitized_text, detection_counts)
        """
        if not text or not isinstance(text, str):
            return text, {}

        types_to_mask = set(mask_types or ["card", "aadhaar", "pan", "phone", "email"])
        counts = {k: 0 for k in ["card", "aadhaar", "pan", "phone", "email"]}
        redacted = text

        # 1. Payment Cards (13-19 digits with Luhn) - Must run before Aadhaar
        if "card" in types_to_mask:
            def _replace_card(match):
                raw = match.group(0)
                if _validate_luhn(raw):
                    counts["card"] += 1
                    return "[CARD_REDACTED]"
                return raw
            redacted = cls.CARD_REGEX.sub(_replace_card, redacted)

        # 2. Aadhaar (12 digits starting 2-9)
        if "aadhaar" in types_to_mask:
            def _replace_aadhaar(match):
                raw = match.group(0)
                clean = re.sub(r"\D", "", raw)
                if len(clean) == 12:
                    counts["aadhaar"] += 1
                    return "[AADHAAR_REDACTED]"
                return raw
            redacted = cls.AADHAAR_REGEX.sub(_replace_aadhaar, redacted)

        # 3. PAN (5 letters, 4 digits, 1 letter)
        if "pan" in types_to_mask:
            def _replace_pan(match):
                counts["pan"] += 1
                return "[PAN_REDACTED]"
            redacted = cls.PAN_REGEX.sub(_replace_pan, redacted)

        # 4. Indian Phone (+91, 0, or 10-digit starting 6-9)
        if "phone" in types_to_mask:
            def _replace_phone(match):
                counts["phone"] += 1
                return "[PHONE_REDACTED]"
            redacted = cls.INDIAN_PHONE_REGEX.sub(_replace_phone, redacted)

        # 5. Email
        if "email" in types_to_mask:
            def _replace_email(match):
                counts["email"] += 1
                return "[EMAIL_REDACTED]"
            redacted = cls.EMAIL_REGEX.sub(_replace_email, redacted)

        active_counts = {k: v for k, v in counts.items() if v > 0}
        return redacted, active_counts

    @classmethod
    def contains_pii(cls, text: str) -> bool:
        """Checks if text contains any PII without modifying it."""
        _, counts = cls.redact_text(text)
        return sum(counts.values()) > 0

    @classmethod
    def mask_partial(cls, value: str, pii_type: str) -> str:
        """Applies partial masking for user-facing displays."""
        if not value:
            return ""
        val = str(value).strip()

        if pii_type.lower() == "aadhaar":
            clean = re.sub(r"\D", "", val)
            if len(clean) == 12:
                return f"XXXX-XXXX-{clean[-4:]}"
            return "[AADHAAR_REDACTED]"

        elif pii_type.lower() == "pan":
            if len(val) == 10:
                return f"{val[:2]}****{val[-2:]}".upper()
            return "[PAN_REDACTED]"

        elif pii_type.lower() == "phone":
            clean = re.sub(r"\D", "", val)
            if len(clean) >= 10:
                return f"+91 ****** {clean[-4:]}"
            return "[PHONE_REDACTED]"

        elif pii_type.lower() == "email":
            if "@" in val:
                user, domain = val.split("@", 1)
                masked_user = user[0] + "***" if len(user) > 1 else "*"
                return f"{masked_user}@{domain}"
            return "[EMAIL_REDACTED]"

        return cls.redact_text(val)[0]
