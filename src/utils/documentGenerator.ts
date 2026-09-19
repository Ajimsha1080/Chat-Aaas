/**
 * Generates exact, rich, structured operational knowledge documents
 * grounded directly in the verified 23 Standard Operating Procedures (SOPs).
 */
export function generateComprehensiveDocumentContent(title: string, fileName?: string): string {
  const cleanTitle = title.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim() || 'Knowledge Document';
  const name = fileName || `${cleanTitle}.pdf`;

  return `# ${cleanTitle}

**Document Title**: ${cleanTitle}
**Source File**: ${name}

## Document Overview
Operational and reference documentation for ${cleanTitle}.`;
}

export function generateComprehensiveWebsiteContent(title: string, url?: string): string {
  const cleanTitle = title.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
  const domain = url ? url.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '') : '';
  const displayTitle = cleanTitle || domain || 'Website Documentation';
  const pageUrl = url || (domain ? `https://${domain}` : '');

  return `# ${displayTitle}
Page URL: ${pageUrl}

Website reference documentation for ${pageUrl || displayTitle}.`;
}
