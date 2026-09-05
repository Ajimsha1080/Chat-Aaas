import ipaddress
import socket
from urllib.parse import urlparse
from typing import Tuple

BLOCKED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.169.254/32"), # AWS/Cloud Metadata
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7")
]

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
                
            if hostname.lower() in ["localhost", "127.0.0.1", "0.0.0.0", "metadata.google.internal"]:
                return False, f"SSRF Attack Blocked: Target '{hostname}' is a restricted local/metadata address."

            # Resolve DNS
            try:
                ip_addresses = socket.getaddrinfo(hostname, None)
            except socket.gaierror:
                return False, f"DNS resolution failed for hostname '{hostname}'."

            for addr_info in ip_addresses:
                raw_ip = addr_info[4][0]
                ip_obj = ipaddress.ip_address(raw_ip)
                for blocked in BLOCKED_NETWORKS:
                    if ip_obj in blocked:
                        return False, f"SSRF Protection Blocked: Host '{hostname}' resolves to private/metadata IP '{raw_ip}'."

            return True, "URL is safe for ingestion."
        except Exception as e:
            return False, f"Safety check error: {str(e)}"

    @staticmethod
    def clean_html_content(raw_html: str) -> str:
        """Strips HTML tags, scripts, and stylesheets safely."""
        import re
        text = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', raw_html, flags=re.IGNORECASE)
        text = re.sub(r'<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>', '', text, flags=re.IGNORECASE)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text
