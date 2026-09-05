/**
 * Server Security & SSRF Protection Utilities
 */

const BLOCKED_IP_RANGES = [
  /^127\./,                 // Loopback
  /^10\./,                  // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  /^192\.168\./,            // 192.168.0.0/16
  /^169\.254\./,            // AWS / Cloud Link-Local & Metadata
  /^0\./,                   // Broadcast
  /^fc00:/,                 // IPv6 Unique local
  /^fe80:/,                 // IPv6 Link-local
  /^::1$/                   // IPv6 Loopback
];

export function validateUrlForCrawler(rawUrl: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are permitted.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Reject localhost and cloud metadata names
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.internal') ||
      hostname === 'instance-data' ||
      hostname === 'metadata.google.internal'
    ) {
      return { valid: false, error: 'Access to internal hostnames is prohibited (SSRF Guard).' };
    }

    // Check IP range blocks
    for (const regex of BLOCKED_IP_RANGES) {
      if (regex.test(hostname)) {
        return { valid: false, error: 'Access to private / link-local IP addresses is prohibited (SSRF Guard).' };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format provided.' };
  }
}

export function sanitizeInput(text: string): string {
  if (!text) return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
}
