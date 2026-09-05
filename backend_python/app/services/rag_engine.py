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
        # Keyword-based & semantic similarity score calculation
        query_words = set(re.findall(r'\w+', query.lower()))
        results: List[ChunkSearchResult] = []

        for chunk in stored_chunks:
            # Enforce strict multi-tenant boundary
            if chunk.get("company_id") != company_id:
                continue

            content = chunk.get("content", "")
            chunk_words = set(re.findall(r'\w+', content.lower()))
            overlap = len(query_words.intersection(chunk_words))
            
            # Combined relevance metric
            if overlap == 0:
                relevance = 0.0
            else:
                relevance = min(1.0, (overlap / max(1, len(query_words))) * 0.8 + 0.2)
            
            if relevance >= threshold:
                results.append(ChunkSearchResult(
                    chunk_id=chunk.get("id", "chk_1"),
                    knowledge_source_id=chunk.get("knowledge_source_id", "src_1"),
                    content=content,
                    similarity_score=round(relevance, 3)
                ))

        results.sort(key=lambda x: x.similarity_score, reverse=True)
        return results[:top_k]

    @staticmethod
    def evaluate_groundedness(chunks: List[ChunkSearchResult], threshold: float = 0.72) -> Tuple[bool, str]:
        """Evaluates whether retrieved chunks provide sufficient evidence to answer without hallucination."""
        if not chunks:
            return False, "No relevant company knowledge found. Refusing to speculate."
        top_score = chunks[0].similarity_score
        if top_score < threshold:
            return False, f"Relevance score {top_score} is below threshold {threshold}. Falling back to safe escalation."
        return True, f"Grounded response with confidence score {top_score}."
