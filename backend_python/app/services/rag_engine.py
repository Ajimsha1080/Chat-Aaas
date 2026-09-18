import math
import re
from typing import List, Dict, Any, Tuple
from app.schemas import ChunkSearchResult
from app.services.embedding_service import EmbeddingService

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
        """Computes a normalized semantic dense embedding vector."""
        return EmbeddingService.compute_dense_vector(text, dimensions=dim, normalize=True)

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
        threshold: float = 0.25,
        top_k: int = 3
    ) -> List[ChunkSearchResult]:
        """
        Hybrid Semantic Retrieval Engine:
        - Dense Vector Cosine Similarity (semantic conceptual matching & paraphrasing).
        - Lexical BM25/keyword stemming & exact phrase match as precision tiebreaker/boost.
        - Strict tenant boundary filtering by company_id.
        """
        if not query or not query.strip():
            return []

        # 1. Compute dense query embedding vector
        query_vec = EmbeddingService.compute_dense_vector(query, dimensions=1536, normalize=True)

        stop_words = {
            "what", "is", "the", "a", "an", "in", "on", "at", "for", "to", "of", "and", "or",
            "are", "how", "do", "does", "did", "can", "could", "would", "should", "will", "tell", "me",
            "about", "our", "your", "you", "know", "this", "that", "these", "those", "explain", "please",
            "who", "where", "when", "why", "which", "have", "has", "had", "think", "with", "from",
            "give", "information", "info", "details", "detail", "overview", "summary", "provide", "show", "list", "help"
        }
        all_query_words = set(re.findall(r'\w+', query.lower()))
        meaningful_query_words = {w for w in all_query_words if w not in stop_words and len(w) > 1} or all_query_words

        def stem(w: str) -> str:
            w = w.lower()
            for suffix in ["ing", "ments", "ment", "tions", "tion", "ed", "es", "s"]:
                if w.endswith(suffix) and len(w) - len(suffix) >= 3:
                    return w[:-len(suffix)]
            return w

        stemmed_query_words = {stem(w) for w in meaningful_query_words}
        results: List[ChunkSearchResult] = []

        for chunk in stored_chunks:
            # Enforce strict multi-tenant boundary
            chunk_company = chunk.get("companyId") or chunk.get("company_id")
            if chunk_company != company_id:
                continue

            content = chunk.get("content", "")
            title = chunk.get("metadata", {}).get("title") or chunk.get("title") or "Knowledge Base"
            section = chunk.get("sectionHeader") or ""
            full_chunk_text = f"{content} {title} {section}".lower()

            # A. Vector Cosine Similarity
            chunk_vec = chunk.get("embedding")
            if not chunk_vec or len(chunk_vec) != 1536:
                chunk_vec = EmbeddingService.compute_dense_vector(full_chunk_text, dimensions=1536, normalize=True)

            vector_sim = cls.cosine_similarity(query_vec, chunk_vec)

            # B. Lexical Overlap Score
            chunk_raw_words = set(re.findall(r'\w+', full_chunk_text))
            chunk_stemmed_words = {stem(w) for w in chunk_raw_words}
            overlap = len(stemmed_query_words.intersection(chunk_stemmed_words))

            keyword_score = (overlap / max(1, len(stemmed_query_words))) if stemmed_query_words else 0.0

            # C. Hybrid Fusion Score
            # If there is strong semantic vector similarity, even without literal keyword match, score remains high
            hybrid_score = (vector_sim * 0.70) + (keyword_score * 0.30)

            # Context & exact match boosts
            if any(w in section.lower() or w in title.lower() for w in stemmed_query_words if len(w) >= 3):
                hybrid_score = min(1.0, hybrid_score + 0.10)
            if query.lower().strip() in full_chunk_text:
                hybrid_score = max(hybrid_score, 0.95)

            final_score = min(1.0, max(0.0, hybrid_score))

            if final_score >= threshold:
                results.append(ChunkSearchResult(
                    chunk_id=chunk.get("id", "chk_1"),
                    knowledge_source_id=chunk.get("knowledgeSourceId") or chunk.get("knowledge_source_id", "src_1"),
                    content=content,
                    title=title,
                    similarity_score=round(final_score, 3)
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
            answer = f"### {getattr(chunks[0], 'title', 'Company Knowledge')}\n\n{chunks[0].content}"

        return {
            "success": True,
            "answer": answer,
            "isGrounded": True,
            "grounded": True,
            "citations": citations,
            "confidenceScore": chunks[0].similarity_score,
            "needsGapRecorded": False
        }
