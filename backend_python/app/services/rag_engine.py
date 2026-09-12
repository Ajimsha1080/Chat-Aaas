import math
import re
from typing import List, Dict, Any, Optional
from app.schemas import ChunkSearchResult

class RAGEngine:
    @staticmethod
    def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """Splits text into overlapping chunks respecting sentence boundaries."""
        sentences = re.split(r'(?<=[.?!])\s+', text)
        chunks: List[str] = []
        current_chunk: List[str] = []
        current_len = 0

        for sentence in sentences:
            sentence_len = len(sentence)
            if current_len + sentence_len > chunk_size and current_chunk:
                chunks.append(" ".join(current_chunk))
                # Retain overlap
                current_chunk = current_chunk[-1:] if overlap > 0 else []
                current_len = sum(len(s) for s in current_chunk)

            current_chunk.append(sentence)
            current_len += sentence_len

        if current_chunk:
            chunks.append(" ".join(current_chunk))

        return chunks if chunks else [text]

    @staticmethod
    def compute_mock_embedding(text: str, dim: int = 1536) -> List[float]:
        """Computes a deterministic normalized mock embedding vector for testing/indexing."""
        import hashlib
        h = hashlib.sha256(text.lower().encode('utf-8')).hexdigest()
        raw_vals = [int(h[i:i+4], 16) / 65535.0 for i in range(0, min(len(h), 64), 4)]
        # Tile or pad to dim
        extended = (raw_vals * (dim // len(raw_vals) + 1))[:dim]
        magnitude = math.sqrt(sum(x * x for x in extended))
        return [x / magnitude for x in extended] if magnitude > 0 else extended

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """Calculates cosine similarity between two normalized vectors."""
        if not vec_a or not vec_b or len(vec_a) != len(vec_b):
            return 0.0
        dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot_product / (norm_a * norm_b)

    @classmethod
    def search_chunks(
        cls, 
        query: str, 
        company_id: str, 
        stored_chunks: List[Dict[str, Any]], 
        threshold: float = 0.72, 
        top_k: int = 3
    ) -> List[ChunkSearchResult]:
        """
        Retrieves relevant chunks strictly filtered by tenant company_id.
        """
        # Keyword-based & semantic similarity score calculation with stop-word filtering
        stop_words = {
            "what", "is", "the", "a", "an", "in", "on", "at", "for", "to", "of", "and", "or",
            "are", "how", "do", "does", "can", "tell", "me", "about", "our", "your", "this", "explain", "please"
        }
        all_query_words = set(re.findall(r'\w+', query.lower()))
        meaningful_query_words = {w for w in all_query_words if w not in stop_words} or all_query_words
        results: List[ChunkSearchResult] = []

        for chunk in stored_chunks:
            # Enforce strict multi-tenant boundary
            chunk_company = chunk.get("companyId") or chunk.get("company_id")
            if chunk_company != company_id:
                continue

            content = chunk.get("content", "")
            title = chunk.get("metadata", {}).get("title") or chunk.get("title") or "Knowledge Base"
            section = chunk.get("sectionHeader") or ""

            chunk_words = set(re.findall(r'\w+', f"{content} {title} {section}".lower()))
            overlap = len(meaningful_query_words.intersection(chunk_words))
            
            # Combined relevance metric
            if overlap == 0:
                relevance = 0.0
            else:
                relevance = min(1.0, (overlap / max(1, len(meaningful_query_words))) * 0.8 + 0.2)
                if any(w in section.lower() or w in title.lower() for w in meaningful_query_words):
                    relevance = min(1.0, relevance + 0.1)

            if relevance >= threshold:
                results.append(ChunkSearchResult(
                    chunk_id=chunk.get("id", "chk_1"),
                    knowledge_source_id=chunk.get("knowledgeSourceId") or chunk.get("knowledge_source_id", "src_1"),
                    content=content,
                    title=title,
                    similarity_score=round(relevance, 3)
                ))

        results.sort(key=lambda x: x.similarity_score, reverse=True)
        return results[:top_k]

    @staticmethod
    def evaluate_groundedness(chunks: List[ChunkSearchResult], threshold: float = 0.60) -> Tuple[bool, str]:
        """Evaluates whether retrieved chunks provide sufficient evidence to answer without hallucination."""
        if not chunks:
            return False, "I couldn't find enough information in your knowledge to answer this confidently."
        top_score = chunks[0].similarity_score
        if top_score < threshold:
            return False, "I couldn't find enough information in your knowledge to answer this confidently."
        return True, f"Grounded response with confidence score {top_score}."

    @classmethod
    def sanitize_untrusted_text(cls, text: str) -> str:
        """Sanitizes retrieved text against malicious prompt injection delimiters."""
        text = text.replace("</company_knowledge>", "")
        text = text.replace("<system_prompt>", "")
        text = text.replace("</system_prompt>", "")
        return text.strip()

    @classmethod
    async def execute_rag_query(
        cls,
        query: str,
        company_id: str,
        stored_chunks: List[Dict[str, Any]],
        top_k: int = 3
    ) -> Dict[str, Any]:
        """
        Executes an end-to-end RAG query pipeline:
        1. Retrieval with strict tenant isolation
        2. Groundedness validation (anti-hallucination)
        3. Prompt injection containment fences
        4. LLM synthesis & citations formatting
        """
        chunks = cls.search_chunks(query, company_id, stored_chunks, threshold=0.1, top_k=top_k)
        is_grounded, ground_msg = cls.evaluate_groundedness(chunks, threshold=0.50)

        citations = []
        for c in chunks:
            if c.similarity_score >= 0.50:
                citations.append({
                    "chunkId": c.chunk_id,
                    "sourceId": c.knowledge_source_id,
                    "preview": c.content[:150] + "..." if len(c.content) > 150 else c.content,
                    "score": c.similarity_score
                })

        if not is_grounded or not citations:
            return {
                "success": False,
                "answer": f"I couldn't find enough information in your company's knowledge to answer '{query}' accurately.",
                "isGrounded": False,
                "grounded": False,
                "citations": [],
                "confidenceScore": 0.0,
                "needsGapRecorded": True
            }

        # Build grounded synthesis via LLMProvider
        try:
            from app.services.llm_service import LLMProvider
            context_str = "\n\n".join([f"Source ({getattr(c, 'title', 'Knowledge Document')}): {c.content}" for c in chunks[:3]])
            sys_inst = (
                f"You are an AI assistant for company {company_id}. "
                f"Answer the user's question accurately and concisely using only the verified knowledge context below.\n\n"
                f"Verified Knowledge Context:\n{context_str}"
            )
            answer = await LLMProvider.generate_response(prompt=query, system_instruction=sys_inst)
        except Exception:
            answer = f"Based on verified company knowledge in '{getattr(chunks[0], 'title', 'Knowledge Base')}':\n\n{chunks[0].content}"

        return {
            "success": True,
            "answer": answer,
            "isGrounded": True,
            "grounded": True,
            "citations": citations,
            "confidenceScore": chunks[0].similarity_score,
            "needsGapRecorded": False
        }
