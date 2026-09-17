import pytest
import socket
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.crawler_service import CrawlerService

@pytest.mark.asyncio
async def test_dns_rebinding_connects_only_to_validated_ip():
    public_ip = "93.184.216.34"
    target_url = "http://rebind-test.com/v1/data"

    fake_addr_info = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (public_ip, 80))]

    with patch("socket.getaddrinfo", return_value=fake_addr_info):
        with patch("httpx.AsyncClient.send", new_callable=AsyncMock) as mock_send:
            mock_resp = MagicMock()
            mock_resp.is_redirect = False
            mock_resp.status_code = 200
            mock_resp.content = b"<html><head><title>Safe Page</title></head><body>Parsed Content</body></html>"
            mock_resp.text = "<html><head><title>Safe Page</title></head><body>Parsed Content</body></html>"
            mock_send.return_value = mock_resp

            result = await CrawlerService.fetch_and_parse(target_url)

            assert result["success"] is True
            assert result["title"] == "Safe Page"
            assert mock_send.called

            sent_req = mock_send.call_args[0][0]
            assert sent_req.url.host == public_ip
            assert sent_req.headers.get("Host") == "rebind-test.com"

@pytest.mark.asyncio
async def test_dns_rebinding_blocked_when_resolving_to_metadata_or_private_ip():
    blocked_ips = [
        "169.254.169.254",
        "127.0.0.1",
        "10.0.0.5",
        "172.16.5.10",
        "192.168.1.1",
        "0.0.0.0"
    ]

    for blocked_ip in blocked_ips:
        fake_addr_info = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (blocked_ip, 80))]
        with patch("socket.getaddrinfo", return_value=fake_addr_info):
            result = await CrawlerService.fetch_and_parse("http://attacker-rebinding-domain.com/secret")
            assert result["success"] is False
            assert "SSRF Protection Blocked" in result["error"]
            assert blocked_ip in result["error"]

@pytest.mark.asyncio
async def test_multi_answer_dns_with_private_ip_is_blocked():
    fake_addr_info = [
        (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 80)),
        (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("169.254.169.254", 80))
    ]
    with patch("socket.getaddrinfo", return_value=fake_addr_info):
        result = await CrawlerService.fetch_and_parse("http://dual-homed-attack.com/data")
        assert result["success"] is False
        assert "SSRF Protection Blocked" in result["error"]
        assert "169.254.169.254" in result["error"]

@pytest.mark.asyncio
async def test_dns_rebinding_on_redirect_hop_is_blocked():
    def mock_getaddrinfo(host, port, *args, **kwargs):
        if "public-landing.com" in host:
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port))]
        elif "evil-rebound.com" in host:
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("169.254.169.254", port))]
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port))]

    with patch("socket.getaddrinfo", side_effect=mock_getaddrinfo):
        with patch("httpx.AsyncClient.send", new_callable=AsyncMock) as mock_send:
            mock_redirect_resp = MagicMock()
            mock_redirect_resp.is_redirect = True
            mock_redirect_resp.headers = {"Location": "http://evil-rebound.com/meta"}
            mock_send.return_value = mock_redirect_resp

            result = await CrawlerService.fetch_and_parse("http://public-landing.com/start")
            assert result["success"] is False
            assert "SSRF Protection Blocked (hop 1)" in result["error"]
            assert "169.254.169.254" in result["error"]
