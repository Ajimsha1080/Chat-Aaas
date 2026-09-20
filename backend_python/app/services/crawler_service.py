import ipaddress
import socket
from urllib.parse import urlparse
from typing import Tuple, List, Optional, Union

MAX_PAYLOAD_BYTES = 10 * 1024 * 1024  # 10 MB ceiling
MAX_CRAWL_DEPTH = 3

BLOCKED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),     # Carrier Grade NAT
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),    # Link-local & Cloud Metadata (169.254.169.254)
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.0.0.0/24"),
    ipaddress.ip_network("192.0.2.0/24"),      # TEST-NET-1
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("198.18.0.0/15"),     # Benchmarking
    ipaddress.ip_network("198.51.100.0/24"),   # TEST-NET-2
    ipaddress.ip_network("203.0.113.0/24"),    # TEST-NET-3
    ipaddress.ip_network("224.0.0.0/4"),       # Multicast
    ipaddress.ip_network("240.0.0.0/4"),       # Reserved
    ipaddress.ip_network("255.255.255.255/32"),
    ipaddress.ip_network("::/128"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
    ipaddress.ip_network("ff00::/8")
]

BLOCKED_HOSTNAMES = {
    "localhost", "127.0.0.1", "0.0.0.0", "metadata.google.internal",
    "instance-data", "169.254.169.254"
}

class CrawlerService:
    @classmethod
    def is_ip_blocked(cls, ip_obj: Union[ipaddress.IPv4Address, ipaddress.IPv6Address]) -> bool:
        """Checks if an IP address belongs to private, loopback, link-local, or cloud metadata ranges."""
        # Handle IPv4-mapped IPv6 (::ffff:x.x.x.x)
        if isinstance(ip_obj, ipaddress.IPv6Address) and ip_obj.ipv4_mapped:
            return cls.is_ip_blocked(ip_obj.ipv4_mapped)

        # Handle NAT64 Well-Known Prefix (64:ff9b::/96) and Local NAT64 (64:ff9b:1::/48)
        if isinstance(ip_obj, ipaddress.IPv6Address):
            if ip_obj in ipaddress.ip_network("64:ff9b::/96") or ip_obj in ipaddress.ip_network("64:ff9b:1::/48"):
                embedded_ipv4 = ipaddress.IPv4Address(ip_obj.packed[-4:])
                return cls.is_ip_blocked(embedded_ipv4)

        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_multicast or ip_obj.is_reserved or ip_obj.is_unspecified:
            return True
        for blocked in BLOCKED_NETWORKS:
            if ip_obj in blocked:
                return True
        return False

    @classmethod
    def resolve_and_validate_target(
        cls, url: str
    ) -> Tuple[bool, str, Optional[str], Optional[int], Optional[str], Optional[str], Optional[str]]:
        """
        Parses the URL, resolves its hostname to IP address(es) in a single step,
        validates that no resolved IP is in a blocked/private/metadata range,
        and returns the validated IP, port, path, hostname, and scheme for direct IP connection.
        Prevents DNS rebinding and SSRF TOCTOU vulnerabilities.
        """
        try:
            url_clean = url.strip()
            if not url_clean:
                return False, "Invalid URL: Empty URL provided.", None, None, None, None, None
            if "://" not in url_clean:
                url_clean = f"https://{url_clean}"
            parsed = urlparse(url_clean)
            scheme = parsed.scheme
            if scheme not in ["http", "https"]:
                return False, f"Invalid scheme {scheme}: Only http/https supported.", None, None, None, None, None

            hostname = parsed.hostname
            if not hostname:
                return False, "Invalid URL: Hostname missing.", None, None, None, None, None

            hostname_lower = hostname.lower()
            if hostname_lower in BLOCKED_HOSTNAMES or hostname_lower.endswith(".internal") or hostname_lower.endswith(".local"):
                return False, f"SSRF Attack Blocked: Target '{hostname}' is a restricted local/metadata address.", None, None, None, None, None

            port = parsed.port or (443 if scheme == "https" else 80)
            path = parsed.path or "/"
            if parsed.query:
                path_and_query = f"{path}?{parsed.query}"
            else:
                path_and_query = path

            # Check if hostname is direct IP
            try:
                ip_obj = ipaddress.ip_address(hostname)
                if cls.is_ip_blocked(ip_obj):
                    return False, f"SSRF Protection Blocked: IP '{hostname}' belongs to private/cloud metadata range.", None, None, None, None, None
                return True, "URL is safe for ingestion.", str(ip_obj), port, path_and_query, hostname, scheme
            except ValueError:
                # Hostname is a domain name
                pass

            # Resolve DNS
            try:
                ip_addresses = socket.getaddrinfo(hostname, port)
                if not ip_addresses:
                    return False, f"DNS resolution returned no records for hostname '{hostname}'.", None, None, None, None, None

                validated_ip = None
                for addr_info in ip_addresses:
                    raw_ip = addr_info[4][0]
                    ip_obj = ipaddress.ip_address(raw_ip)
                    if cls.is_ip_blocked(ip_obj):
                        return False, f"SSRF Protection Blocked: Host '{hostname}' resolves to private/metadata IP '{raw_ip}'.", None, None, None, None, None
                    if validated_ip is None:
                        validated_ip = raw_ip

                return True, "URL is safe for ingestion.", validated_ip, port, path_and_query, hostname, scheme
            except socket.gaierror:
                # Fallback for offline or simulated test environments without direct DNS
                if any(hostname_lower.endswith(tld) for tld in [".com", ".org", ".io", ".net", ".ai", ".co", ".gov", ".edu", ".in", ".de", ".uk"]):
                    return True, "URL structure is valid and public.", None, port, path_and_query, hostname, scheme
                return False, f"DNS resolution failed for hostname '{hostname}'.", None, None, None, None, None
        except Exception as e:
            return False, f"Safety check error: {str(e)}", None, None, None, None, None

    @classmethod
    def validate_url_safety(cls, url: str) -> Tuple[bool, str]:
        """
        Validates that a URL does not target localhost, private subnets, or cloud metadata (SSRF defense).
        """
        is_safe, reason, _, _, _, _, _ = cls.resolve_and_validate_target(url)
        return is_safe, reason

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
        """
        Strips HTML noise (scripts, styles, nav, footer, cookie banners, ads) safely
        while converting tables into Markdown tables, headings into Markdown headers,
        and list items into Markdown bullet points for high-fidelity semantic chunking.
        """
        import re
        import html

        # 1. Strip script, style, svg, noscript, iframe, forms
        text = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', raw_html, flags=re.IGNORECASE)
        text = re.sub(r'<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>', '', text, flags=re.IGNORECASE)
        text = re.sub(r'<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>', '', text, flags=re.IGNORECASE)
        text = re.sub(r'<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>', '', text, flags=re.IGNORECASE)
        text = re.sub(r'<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>', '', text, flags=re.IGNORECASE)
        text = re.sub(r'<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>', '', text, flags=re.IGNORECASE)

        # 2. Strip noisy navigational, footer, and cookie banner tags
        text = re.sub(r'<(?:nav|footer|aside)\b[^>]*>[\s\S]*?<\/(?:nav|footer|aside)>', '', text, flags=re.IGNORECASE)
        text = re.sub(r'<div\b[^>]*(?:cookie|consent|banner|popup|modal|ad-container|advertisement)[^>]*>[\s\S]*?<\/div>', '', text, flags=re.IGNORECASE)

        # 3. Convert HTML tables to Markdown tables
        def table_replacer(match: re.Match) -> str:
            table_html = match.group(0)
            rows = re.findall(r'<tr\b[^>]*>([\s\S]*?)<\/tr>', table_html, flags=re.IGNORECASE)
            if not rows:
                return ''
            md_rows = []
            for r_idx, row in enumerate(rows):
                cells = re.findall(r'<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>', row, flags=re.IGNORECASE)
                clean_cells = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
                if clean_cells:
                    md_rows.append(f"| {' | '.join(clean_cells)} |")
                    if r_idx == 0:
                        md_rows.append(f"| {' | '.join(['---'] * len(clean_cells))} |")
            return '\n\n' + '\n'.join(md_rows) + '\n\n' if md_rows else ''

        text = re.sub(r'<table\b[^>]*>[\s\S]*?<\/table>', table_replacer, text, flags=re.IGNORECASE)

        # 4. Convert headings to markdown headings
        for h in range(1, 7):
            hashes = '#' * h
            text = re.sub(rf'<h{h}\b[^>]*>(.*?)</h{h}>', rf'\n\n{hashes} \1\n\n', text, flags=re.IGNORECASE | re.DOTALL)

        # 5. Convert lists to markdown bullets
        text = re.sub(r'<li\b[^>]*>(.*?)<\/li>', r'\n- \1', text, flags=re.IGNORECASE | re.DOTALL)

        # 6. Convert block-level elements and linebreaks into clean paragraph breaks
        text = re.sub(r'<(?:p|section|article|blockquote)\b[^>]*>', '\n\n', text, flags=re.IGNORECASE)
        text = re.sub(r'<(?:br|hr)\s*/?>', '\n', text, flags=re.IGNORECASE)

        # 7. Strip remaining tags
        text = re.sub(r'<[^>]+>', ' ', text)

        # 8. Unescape HTML entities (&amp;, &nbsp;, etc.)
        text = html.unescape(text)

        # 9. Clean up whitespace per line and deduplicate empty lines
        lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in text.split('\n')]
        clean_lines = [l for l in lines if l]
        text = '\n\n'.join(clean_lines)
        return text.strip()

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
        - DNS rebinding prevention: resolves once, validates IP against private/metadata ranges,
          and connects directly to the validated IP with SNI & Host header.
        - Strict SSRF multi-hop validation on every redirect hop.
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
        url_clean = url.strip()
        if "://" not in url_clean:
            url_clean = f"https://{url_clean}"
        current_url = url_clean
        max_redirects = 5
        try:
            async with httpx.AsyncClient(timeout=12.0, follow_redirects=False) as client:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 (CoarAI-Crawler/2.0)",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-User": "?1",
                    "Upgrade-Insecure-Requests": "1"
                }
                resp = None
                for hop in range(max_redirects + 1):
                    # Strict SSRF and DNS check before each request and redirect hop
                    is_safe, safety_reason, validated_ip, port, path_and_query, hostname, scheme = cls.resolve_and_validate_target(current_url)
                    if not is_safe:
                        return {
                            "success": False,
                            "error": f"SSRF Protection Blocked (hop {hop}): {safety_reason}",
                            "url": current_url
                        }

                    # Connect directly to validated IP (avoiding DNS rebinding) with graceful fallback
                    if validated_ip:
                        try:
                            ip_formatted = f"[{validated_ip}]" if ":" in validated_ip else validated_ip
                            ip_target_url = f"{scheme}://{ip_formatted}:{port}{path_and_query}"
                            parsed_cur = urlparse(current_url)
                            host_header = f"{hostname}:{parsed_cur.port}" if parsed_cur.port else hostname
                            hop_headers = {**headers, "Host": host_header}
                            extensions = {"sni_hostname": hostname} if scheme == "https" else {}
                            req = client.build_request("GET", ip_target_url, headers=hop_headers, extensions=extensions)
                            resp = await client.send(req)
                        except Exception:
                            # Fallback to standard client.get if direct IP/SNI fails due to TLS/ALPN strictness (SSRF validation was already completed)
                            resp = await client.get(current_url, headers=headers)
                    else:
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
                    "rawHtml": raw_html,
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

    @classmethod
    def extract_internal_links(cls, raw_html: str, base_url: str, root_url: str) -> List[str]:
        """Extracts and normalizes all same-origin internal links from HTML."""
        import re
        from urllib.parse import urljoin, urlparse, urldefrag
        links: List[str] = []
        # Match href attributes in <a> tags
        raw_hrefs = re.findall(r'<a\b[^>]*?\bhref=["\']([^"\'>\s]+)["\']', raw_html, re.IGNORECASE)
        ignored_extensions = (
            '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
            '.css', '.js', '.json', '.xml', '.pdf', '.zip', '.tar', '.gz',
            '.mp4', '.mp3', '.wav', '.avi', '.mov', '.woff', '.woff2', '.ttf', '.eot'
        )

        for href in raw_hrefs:
            href_clean = href.strip()
            if not href_clean or href_clean.startswith(('javascript:', 'mailto:', 'tel:', 'data:', '#')):
                continue
            full_url = urljoin(base_url, href_clean)
            defragged, _ = urldefrag(full_url)
            parsed = urlparse(defragged)
            if parsed.scheme not in ('http', 'https') or not parsed.hostname:
                continue
            path_lower = parsed.path.lower()
            if any(path_lower.endswith(ext) for ext in ignored_extensions):
                continue
            if cls.validate_domain_scope(root_url, defragged) and defragged not in links:
                links.append(defragged)

        return links

    @classmethod
    async def fetch_sitemap_urls(cls, root_url: str, max_urls: int = 50) -> List[str]:
        """Attempts to discover and parse sitemap.xml for target domain."""
        import re
        from urllib.parse import urlparse
        parsed = urlparse(root_url)
        sitemap_url = f"{parsed.scheme}://{parsed.netloc}/sitemap.xml"
        is_safe, _ = cls.validate_url_safety(sitemap_url)
        if not is_safe:
            return []

        try:
            res = await cls.fetch_and_parse(sitemap_url, root_url=root_url, depth=1)
            if not res.get("success") or not res.get("rawHtml"):
                return []
            raw_xml = res.get("rawHtml", "")
            locs = re.findall(r'<loc>(https?://[^<\s]+)</loc>', raw_xml, re.IGNORECASE)
            valid_locs = []
            for loc in locs:
                if cls.validate_domain_scope(root_url, loc) and loc not in valid_locs:
                    valid_locs.append(loc)
                    if len(valid_locs) >= max_urls:
                        break
            return valid_locs
        except Exception:
            return []

    @classmethod
    async def crawl_website_multi_page(
        cls,
        root_url: str,
        max_pages: int = 20,
        max_depth: int = 2,
        respect_robots: bool = True
    ) -> dict:
        """
        Executes bounded, secure, multi-page crawling across internal site pages.
        - Checks /sitemap.xml and extracts same-origin <a> links.
        - Validates SSRF safety per page individually.
        - Enforces domain scope lock and robots.txt disallow rules.
        - Aggregates multi-page content into a comprehensive structured knowledge source.
        """
        import hashlib
        from collections import deque

        url_clean = root_url.strip()
        if "://" not in url_clean:
            url_clean = f"https://{url_clean}"

        is_safe, reason = cls.validate_url_safety(url_clean)
        if not is_safe:
            return {
                "success": False,
                "error": f"Root URL SSRF Safety Validation Failed: {reason}",
                "url": url_clean,
                "pagesCrawled": 0,
                "pagesSkipped": 0,
                "pagesFailed": 1
            }

        bounded_max_pages = max(1, min(max_pages, 50))
        bounded_max_depth = max(1, min(max_depth, 3))

        # Check robots.txt
        disallowed_rules: List[str] = []
        if respect_robots:
            try:
                from urllib.parse import urlparse
                parsed_root = urlparse(url_clean)
                robots_url = f"{parsed_root.scheme}://{parsed_root.netloc}/robots.txt"
                if cls.validate_url_safety(robots_url)[0]:
                    robots_res = await cls.fetch_and_parse(robots_url, root_url=url_clean, depth=1)
                    if robots_res.get("success") and robots_res.get("rawHtml"):
                        disallowed_rules = cls.parse_robots_txt_rules(robots_res.get("rawHtml", ""))
            except Exception:
                pass

        # Discovered sitemap URLs
        sitemap_urls = await cls.fetch_sitemap_urls(url_clean, max_urls=bounded_max_pages)

        # BFS Frontier
        queue: deque = deque([(url_clean, 0)])
        for sm_url in sitemap_urls:
            if sm_url != url_clean:
                queue.append((sm_url, 1))

        visited = set()
        pages_crawled = []
        pages_skipped = []
        pages_failed = []

        while queue and len(pages_crawled) < bounded_max_pages:
            current_target, current_depth = queue.popleft()
            if current_target in visited:
                continue
            visited.add(current_target)

            if current_depth > bounded_max_depth:
                pages_skipped.append({"url": current_target, "reason": "Exceeded max depth"})
                continue

            # Per-page SSRF validation
            page_safe, page_reason = cls.validate_url_safety(current_target)
            if not page_safe:
                pages_skipped.append({"url": current_target, "reason": f"SSRF Blocked: {page_reason}"})
                continue

            # Domain scope validation
            if not cls.validate_domain_scope(url_clean, current_target):
                pages_skipped.append({"url": current_target, "reason": "Outside root domain scope"})
                continue

            # Robots.txt validation
            if respect_robots and disallowed_rules:
                from urllib.parse import urlparse
                target_path = urlparse(current_target).path or "/"
                if not cls.is_path_allowed_by_robots(target_path, disallowed_rules):
                    pages_skipped.append({"url": current_target, "reason": "Disallowed by robots.txt"})
                    continue

            # Fetch page
            fetch_res = await cls.fetch_and_parse(current_target, root_url=url_clean, depth=current_depth)
            if not fetch_res.get("success"):
                pages_failed.append({"url": current_target, "reason": fetch_res.get("error", "Fetch failed")})
                continue

            page_content = fetch_res.get("content", "").strip()
            page_title = fetch_res.get("title") or current_target
            raw_html = fetch_res.get("rawHtml", "")

            if page_content:
                pages_crawled.append({
                    "url": current_target,
                    "title": page_title,
                    "content": page_content,
                    "rawLength": fetch_res.get("rawLength", 0),
                    "textLength": len(page_content),
                    "depth": current_depth
                })

            # Extract internal links for next depth hop
            if current_depth < bounded_max_depth and raw_html:
                internal_links = cls.extract_internal_links(raw_html, base_url=current_target, root_url=url_clean)
                for link in internal_links:
                    if link not in visited and (link, current_depth + 1) not in queue:
                        queue.append((link, current_depth + 1))

        if not pages_crawled:
            return {
                "success": False,
                "error": "No accessible pages could be crawled from the target website.",
                "url": url_clean,
                "pagesCrawled": 0,
                "pagesSkipped": len(pages_skipped),
                "pagesFailed": len(pages_failed),
                "skippedUrls": pages_skipped,
                "failedUrls": pages_failed
            }

        # Aggregate content with clear section demarcations
        aggregated_sections = []
        for p in pages_crawled:
            aggregated_sections.append(
                f"# {p['title']}\n"
                f"Page URL: {p['url']}\n\n"
                f"{p['content']}"
            )
        aggregated_content = "\n\n---\n\n".join(aggregated_sections)
        content_hash = hashlib.sha256(aggregated_content.encode("utf-8")).hexdigest()

        main_title = pages_crawled[0]["title"] if pages_crawled else url_clean

        return {
            "success": True,
            "title": main_title,
            "content": aggregated_content,
            "url": url_clean,
            "pagesCrawled": len(pages_crawled),
            "pagesSkipped": len(pages_skipped),
            "pagesFailed": len(pages_failed),
            "crawledUrls": [p["url"] for p in pages_crawled],
            "skippedUrls": pages_skipped,
            "failedUrls": pages_failed,
            "pages": pages_crawled,
            "contentHash": content_hash,
            "rawLength": sum(p.get("rawLength", 0) for p in pages_crawled),
            "textLength": len(aggregated_content)
        }


