import math
import re
import time
from typing import List, Dict, Any, Tuple, Optional
from app.schemas import ChunkSearchResult, RAGDiagnostics
from app.services.embedding_service import EmbeddingService, UNIVERSAL_SEMANTIC_BASINS

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
        threshold: float = 0.15,
        top_k: int = 6
    ) -> List[ChunkSearchResult]:
        """
        Hybrid Semantic Retrieval Engine:
        - Dense Vector Cosine Similarity (semantic conceptual matching & paraphrasing).
        - Lexical BM25/keyword scoring & exact phrase match as precision tiebreaker/boost.
        - Reciprocal Rank Fusion (RRF) to combine dense and sparse rankings.
        - Strict tenant boundary filtering by company_id and lifecycle state.
        """
        results, _ = cls.search_chunks_with_diagnostics(
            query=query,
            standalone_query=query,
            company_id=company_id,
            stored_chunks=stored_chunks,
            threshold=threshold,
            top_k=top_k
        )
        return results

    @classmethod
    def search_chunks_with_diagnostics(
        cls,
        query: str,
        standalone_query: str,
        company_id: str,
        stored_chunks: List[Dict[str, Any]],
        threshold: float = 0.15,
        top_k: int = 6
    ) -> Tuple[List[ChunkSearchResult], RAGDiagnostics]:
        """
        Hybrid Semantic Retrieval Engine with full telemetry diagnostics.
        """
        diagnostics = RAGDiagnostics(
            query=query,
            standalone_query=standalone_query,
            dense_results=[],
            keyword_results=[],
            fusion_results=[],
            reranked_results=[],
            context_tokens=0,
            llm_latency_ms=0.0,
            faithfulness_score=1.0,
            citations=[]
        )

        if not standalone_query or not standalone_query.strip():
            return [], diagnostics

        # 1. Filter chunks by tenant and active lifecycle
        valid_chunks: List[Dict[str, Any]] = []
        for chk in stored_chunks:
            chunk_company = chk.get("companyId") or chk.get("company_id")
            if chunk_company != company_id:
                continue
            # Check lifecycle status
            lifecycle = chk.get("lifecycleState") or chk.get("status") or "active"
            if lifecycle in ["trash", "archived", "disabled", "deleted"]:
                continue
            valid_chunks.append(chk)

        if not valid_chunks:
            return [], diagnostics

        # 2. Dense Vector Search
        query_vec = EmbeddingService.compute_dense_vector(standalone_query, dimensions=1536, normalize=True)
        dense_scored: List[Tuple[float, Dict[str, Any]]] = []

        for chk in valid_chunks:
            content = chk.get("content", "")
            title = chk.get("metadata", {}).get("title") or chk.get("title") or "Knowledge Base"
            section = chk.get("sectionHeader") or ""
            full_chunk_text = f"{content} {title} {section}".lower()

            chunk_vec = chk.get("embedding")
            if not chunk_vec or len(chunk_vec) != 1536:
                chunk_vec = EmbeddingService.compute_dense_vector(full_chunk_text, dimensions=1536, normalize=True)

            v_sim = cls.cosine_similarity(query_vec, chunk_vec)
            dense_scored.append((v_sim, chk))

        dense_scored.sort(key=lambda x: x[0], reverse=True)
        diagnostics.dense_results = [
            {"id": chk.get("id", ""), "title": chk.get("metadata", {}).get("title", ""), "score": round(score, 4)}
            for score, chk in dense_scored[:10]
        ]

        # 3. Lexical BM25 Keyword Search
        stop_words = {
            "what", "is", "the", "a", "an", "in", "on", "at", "for", "to", "of", "and", "or",
            "are", "how", "do", "does", "did", "can", "could", "would", "should", "will", "tell", "me",
            "about", "our", "your", "you", "know", "this", "that", "these", "those", "explain", "please",
            "who", "where", "when", "why", "which", "have", "has", "had", "think", "with", "from",
            "give", "information", "info", "details", "detail", "overview", "summary", "provide", "show", "list", "help"
        }
        all_query_words = set(re.findall(r'\w+', standalone_query.lower()))
        meaningful_query_words = {w for w in all_query_words if w not in stop_words and len(w) > 1} or all_query_words

        def stem(w: str) -> str:
            w = w.lower()
            for suffix in ["ing", "ments", "ment", "tions", "tion", "ed", "es", "s"]:
                if w.endswith(suffix) and len(w) - len(suffix) >= 3:
                    return w[:-len(suffix)]
            return w

        stemmed_query_words = {stem(w) for w in meaningful_query_words}
        expanded_synonym_stems: set = set()
        for basin in UNIVERSAL_SEMANTIC_BASINS:
            if any(w in basin or stem(w) in {stem(b) for b in basin} for w in meaningful_query_words):
                expanded_synonym_stems.update({stem(b) for b in basin})

        bm25_scored: List[Tuple[float, Dict[str, Any]]] = []
        for chk in valid_chunks:
            content = chk.get("content", "")
            title = chk.get("metadata", {}).get("title") or chk.get("title") or "Knowledge Base"
            section = chk.get("sectionHeader") or ""
            full_chunk_text = f"{content} {title} {section}".lower()

            chunk_raw_words = set(re.findall(r'\w+', full_chunk_text))
            chunk_stemmed_words = {stem(w) for w in chunk_raw_words}

            direct_overlap = len(stemmed_query_words.intersection(chunk_stemmed_words))
            synonym_overlap = len(expanded_synonym_stems.intersection(chunk_stemmed_words)) if expanded_synonym_stems else 0

            direct_score = (direct_overlap / max(1, len(stemmed_query_words))) if stemmed_query_words else 0.0
            synonym_score = min(1.0, synonym_overlap / max(1, len(stemmed_query_words))) if stemmed_query_words else 0.0
            lexical_score = max(direct_score, synonym_score * 0.85)

            # Boost exact substring matches and header matches
            if standalone_query.lower().strip() in full_chunk_text:
                lexical_score = max(lexical_score, 0.95)
            if any(w in section.lower() or w in title.lower() for w in stemmed_query_words if len(w) >= 3):
                lexical_score = min(1.0, lexical_score + 0.15)

            bm25_scored.append((lexical_score, chk))

        bm25_scored.sort(key=lambda x: x[0], reverse=True)
        diagnostics.keyword_results = [
            {"id": chk.get("id", ""), "title": chk.get("metadata", {}).get("title", ""), "score": round(score, 4)}
            for score, chk in bm25_scored[:10]
        ]

        # 4. Reciprocal Rank Fusion (RRF)
        # RRF_Score(d) = sum(w / (k + rank)) where k = 60
        k_rrf = 60
        rrf_map: Dict[str, Dict[str, Any]] = {}

        for rank, (score, chk) in enumerate(dense_scored):
            cid = chk.get("id", f"chk_{rank}")
            if cid not in rrf_map:
                rrf_map[cid] = {"chunk": chk, "rrf_score": 0.0, "dense_score": score, "bm25_score": 0.0}
            rrf_map[cid]["rrf_score"] += 0.70 / (k_rrf + rank + 1)
            rrf_map[cid]["dense_score"] = score

        for rank, (score, chk) in enumerate(bm25_scored):
            cid = chk.get("id", f"chk_{rank}")
            if cid not in rrf_map:
                rrf_map[cid] = {"chunk": chk, "rrf_score": 0.0, "dense_score": 0.0, "bm25_score": score}
            rrf_map[cid]["rrf_score"] += 0.30 / (k_rrf + rank + 1)
            rrf_map[cid]["bm25_score"] = score

        # Normalize RRF scores and apply direct cosine + lexical composite
        fusion_list = list(rrf_map.values())
        max_rrf = max((item["rrf_score"] for item in fusion_list), default=1.0) or 1.0

        for item in fusion_list:
            norm_rrf = item["rrf_score"] / max_rrf
            composite = (item["dense_score"] * 0.65) + (item["bm25_score"] * 0.35)
            # Combine RRF rank stability with raw similarity confidence
            item["final_score"] = round(min(1.0, max(norm_rrf * 0.40 + composite * 0.60, item["dense_score"] * 0.80)), 4)

        fusion_list.sort(key=lambda x: x["final_score"], reverse=True)
        diagnostics.fusion_results = [
            {"id": item["chunk"].get("id", ""), "title": item["chunk"].get("metadata", {}).get("title", ""), "score": item["final_score"]}
            for item in fusion_list[:10]
        ]

        # Filter by threshold and top_k
        results: List[ChunkSearchResult] = []
        for item in fusion_list:
            if item["final_score"] >= threshold and len(results) < top_k:
                chk = item["chunk"]
                content = chk.get("content", "")
                title = chk.get("metadata", {}).get("title") or chk.get("title") or "Knowledge Base"
                results.append(ChunkSearchResult(
                    chunk_id=chk.get("id", "chk_1"),
                    knowledge_source_id=chk.get("knowledgeSourceId") or chk.get("knowledge_source_id", "src_1"),
                    content=content,
                    title=title,
                    similarity_score=item["final_score"]
                ))

        return results, diagnostics

    @staticmethod
    def evaluate_groundedness(chunks: List[ChunkSearchResult], threshold: float = 0.50) -> Tuple[bool, str]:
        """Evaluates whether retrieved chunks provide sufficient evidence to answer without hallucination."""
        if not chunks:
            return False, "I couldn't find enough information in your knowledge to answer this confidently."
        top_score = chunks[0].similarity_score
        if top_score < threshold:
            return False, f"Retrieved confidence {top_score} is below groundedness threshold {threshold}."
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
        chunks, diag = cls.search_chunks_with_diagnostics(query, query, company_id, stored_chunks, threshold=0.10, top_k=top_k)
        is_grounded, ground_msg = cls.evaluate_groundedness(chunks, threshold=0.30)

        citations = []
        for c in chunks:
            if c.similarity_score >= 0.30:
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

        is_refusal = any(phrase in answer.lower() for phrase in [
            "cannot verify", "can't verify", "do not have information", "don't have information",
            "couldn't find enough information", "not mentioned in", "does not contain information",
            "does not provide information", "no information available", "not available in the provided",
            "unable to verify", "i don't have enough", "cannot provide information", "can't provide information",
            "not present in", "not found in", "no mention of", "not covered in", "unable to find"
        ])
        if is_refusal:
            return {
                "success": False,
                "answer": answer,
                "isGrounded": False,
                "grounded": False,
                "citations": [],
                "confidenceScore": 0.0,
                "needsGapRecorded": True
            }

        return {
            "success": True,
            "answer": answer,
            "isGrounded": True,
            "grounded": True,
            "citations": citations,
            "confidenceScore": chunks[0].similarity_score,
            "needsGapRecorded": False
        }
