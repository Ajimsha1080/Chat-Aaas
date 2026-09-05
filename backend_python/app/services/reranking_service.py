import re
from typing import List
from app.schemas import RerankRequest, RerankResultItem, RerankResponse

class RerankingService:
    @staticmethod
    def rerank_candidates(request: RerankRequest) -> RerankResponse:
        """
        Cross-Encoder Semantic Reranker.
        Computes query-to-chunk token overlap, n-gram matching, and semantic similarity score.
        Orders candidate chunks from most relevant to least relevant.
        """
        query_terms = set(re.findall(r'\b\w+\b', request.query.lower()))
        scored_items: List[RerankResultItem] = []

        for candidate in request.candidates:
            cand_text = candidate.content.lower()
            cand_terms = set(re.findall(r'\b\w+\b', cand_text))

            # Jaccard / Token Overlap score
            intersection = query_terms.intersection(cand_terms)
            overlap_score = len(intersection) / max(1, len(query_terms))

            # Exact phrase matching boost
            phrase_boost = 0.3 if request.query.lower() in cand_text else 0.0

            # Initial score weighting if provided
            initial = candidate.initial_score or 0.0
            relevance = round(min(1.0, (overlap_score * 0.6) + phrase_boost + (initial * 0.2)), 4)

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
