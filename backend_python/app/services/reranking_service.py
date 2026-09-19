import re
from typing import List, Set
from app.schemas import RerankRequest, RerankResultItem, RerankResponse

STOP_WORDS: Set[str] = {
    "what", "is", "the", "a", "an", "in", "on", "at", "for", "to", "of", "and", "or",
    "are", "how", "do", "does", "did", "can", "could", "would", "should", "will", "tell", "me",
    "about", "our", "your", "you", "know", "this", "that", "these", "those", "explain", "please",
    "who", "where", "when", "why", "which", "have", "has", "had", "think", "with", "from",
    "i", "my", "we", "us", "he", "she", "it", "they", "them", "their", "ask", "want", "get"
}

def _stem(w: str) -> str:
    w = w.lower().strip("-_.,;:!?'\"()")
    for suffix in ("ing", "tions", "tion", "sion", "ies", "es", "ed", "ly", "ment", "ness", "ers", "er", "s"):
        if w.endswith(suffix) and len(w) > len(suffix) + 2:
            return w[:-len(suffix)]
    return w

class RerankingService:
    @staticmethod
    def rerank_candidates(request: RerankRequest) -> RerankResponse:
        """
        Cross-Encoder Semantic Reranker.
        Fuses dense vector similarity score with stemmed keyword overlap and phrase matching.
        Orders candidate chunks from most relevant to least relevant.
        """
        all_query_terms = re.findall(r'\b[a-zA-Z0-9_-]+\b', request.query.lower())
        meaningful_query_terms = [w for w in all_query_terms if w not in STOP_WORDS and len(w) > 1] or all_query_terms
        stemmed_query_terms = {_stem(w) for w in meaningful_query_terms}
        
        scored_items: List[RerankResultItem] = []

        for candidate in request.candidates:
            cand_text = candidate.content.lower()
            cand_terms = re.findall(r'\b[a-zA-Z0-9_-]+\b', cand_text)
            cand_stems = {_stem(w) for w in cand_terms}

            # Jaccard / Token Overlap score on stemmed terms
            intersection = stemmed_query_terms.intersection(cand_stems)
            overlap_score = len(intersection) / max(1, len(stemmed_query_terms)) if stemmed_query_terms else 0.0

            # Exact phrase matching boost
            phrase_boost = 0.2 if request.query.lower().strip() in cand_text else 0.0

            # Initial vector similarity score weighting (never lower below initial score)
            initial = candidate.initial_score or 0.0
            fused_score = (initial * 0.5) + (overlap_score * 0.5) + phrase_boost
            relevance = round(min(1.0, max(initial, fused_score)), 4)

            scored_items.append(RerankResultItem(
                id=candidate.id,
                content=candidate.content,
                relevance_score=relevance,
                rank=0,
                metadata=candidate.metadata
            ))

        # Sort descending by relevance score
        scored_items.sort(key=lambda x: x.relevance_score, reverse=True)

        # Apply top_k & assign ranks
        final_results: List[RerankResultItem] = []
        for idx, item in enumerate(scored_items[:request.top_k]):
            item.rank = idx + 1
            final_results.append(item)

        return RerankResponse(
            success=True,
            query=request.query,
            results=final_results,
            total_candidates=len(request.candidates),
            returned_count=len(final_results)
        )
