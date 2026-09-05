/**
 * SSRF-Protected Website Crawler Service
 */

import { validateUrlForCrawler } from '../middleware/security';
import { db } from '../db/database';
import { RAGEngine } from './ragEngine';
import { KnowledgeSourceEntity } from '../db/schema';

export class CrawlerService {
  public static async crawlUrl(
    companyId: string,
    rawUrl: string,
    category = 'Website'
  ): Promise<{ success: boolean; sourceId?: string; chunksCount?: number; error?: string }> {
    const validation = validateUrlForCrawler(rawUrl);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const sourceId = `src-crawl-${Date.now()}`;
    const parsed = new URL(rawUrl);
    const domainTitle = `${parsed.hostname}${parsed.pathname}`;

    // Simulated clean page extraction (SSRF-safe)
    const extractedContent = `Official Website Knowledge for ${domainTitle}.\n` +
      `Features, product documentation, SLAs, and support protocols for ${parsed.hostname}.\n` +
      `All services include enterprise support, dedicated API endpoints, and 99.99% uptime availability.`;

    const chunks = RAGEngine.chunkText(extractedContent, sourceId, companyId, domainTitle, category);
    const totalTokens = chunks.reduce((acc, c) => acc + c.tokenCount, 0);

    const source: KnowledgeSourceEntity = {
      id: sourceId,
      companyId,
      type: 'url',
      title: domainTitle,
      sourceUrl: rawUrl,
      category,
      status: 'indexed',
      rawContent: extractedContent,
      chunksCount: chunks.length,
      tokenCount: totalTokens,
      lastIndexedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.knowledgeSources.set(sourceId, source);
    for (const chunk of chunks) {
      db.documentChunks.set(chunk.id, chunk);
    }

    return {
      success: true,
      sourceId,
      chunksCount: chunks.length
    };
  }
}
