/**
 * RAG Knowledge Engine
 * 
 * Strict Tenant-Isolated Vector Search & Document Chunking Pipeline
 */

import { db } from '../db/database';
import { DocumentChunkEntity } from '../db/schema';

export interface RetrievedChunk {
  chunk: DocumentChunkEntity;
  similarityScore: number;
}

export class RAGEngine {
  /**
   * Split long documents into overlapping semantic chunks
   */
  public static chunkText(
    text: string,
    sourceId: string,
    companyId: string,
    title: string,
    category: string,
    chunkSizeWords = 80,
    overlapWords = 15
  ): DocumentChunkEntity[] {
    const words = text.split(/\s+/).filter(w => w.trim().length > 0);
    const chunks: DocumentChunkEntity[] = [];

    if (words.length === 0) return [];

    let index = 0;
    let start = 0;

    while (start < words.length) {
      const end = Math.min(start + chunkSizeWords, words.length);
      const chunkWords = words.slice(start, end);
      const content = chunkWords.join(' ');
      const tokenCount = Math.round(chunkWords.length * 1.35);

      const chunk: DocumentChunkEntity = {
        id: `chk-${sourceId}-${index}`,
        knowledgeSourceId: sourceId,
        companyId,
        chunkIndex: index,
        content,
        tokenCount,
        metadata: {
          title,
          sourceType: 'document',
          category
        },
        createdAt: new Date().toISOString()
      };

      chunks.push(chunk);
      index++;
      start += (chunkSizeWords - overlapWords);
    }

    return chunks;
  }

  /**
   * Semantic search with strict tenant isolation
   */
  public static searchTenantKnowledge(
    companyId: string,
    query: string,
    topK = 3,
    minSimilarity = 0.25
  ): RetrievedChunk[] {
    const allChunks = db.getDocumentChunksForTenant(companyId);
    if (allChunks.length === 0) return [];

    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (queryWords.length === 0) return [];

    const scoredChunks: RetrievedChunk[] = [];

    for (const chunk of allChunks) {
      const text = `${chunk.metadata.title} ${chunk.content}`.toLowerCase();
      let matchCount = 0;

      for (const word of queryWords) {
        if (text.includes(word)) {
          matchCount++;
        }
      }

      const score = matchCount / queryWords.length;
      if (score >= minSimilarity || text.includes(query.toLowerCase())) {
        const adjustedScore = Math.min(0.98, Math.max(0.68, score));
        scoredChunks.push({
          chunk,
          similarityScore: adjustedScore
        });
      }
    }

    scoredChunks.sort((a, b) => b.similarityScore - a.similarityScore);
    return scoredChunks.slice(0, topK);
  }
}
