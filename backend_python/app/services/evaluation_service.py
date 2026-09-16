import re
from typing import List, Set
from app.schemas import EvaluateRequest, EvaluateResponse

STOPWORDS: Set[str] = {
    "the", "a", "an", "is", "are", "was", "were", "and", "or", "in", "on", "at", "to", "for",
    "with", "this", "that", "these", "those", "it", "its", "of", "as", "by", "from", "you", "your",
    "can", "get", "will", "be", "been", "we", "our", "us", "do", "does", "did", "have", "has", "had",
    "using", "used", "through", "prevent", "under", "their", "when", "which", "while", "into",
    "like", "such", "more", "other", "after", "before", "during", "between", "over", "above",
    "below", "than", "then", "both", "each", "all", "any", "some", "what", "where", "how", "why",
    "who", "whom", "whose", "if", "so", "up", "out", "about", "against", "cannot", "could", "should",
    "would", "must", "across", "along", "around", "behind", "down", "off", "near", "per"
}

def _stem(token: str) -> str:
    """Performs lightweight morphological suffix reduction for robust lemma alignment."""
    w = token.lower().strip("-_.,;:!?'\"()")
    for suffix in ("ing", "tions", "tion", "sion", "ies", "es", "ed", "ly", "ment", "ness", "ers", "er", "s"):
        if w.endswith(suffix) and len(w) > len(suffix) + 2:
            return w[:-len(suffix)]
    return w

class EvaluationService:
    @staticmethod
    def evaluate_rag_response(request: EvaluateRequest) -> EvaluateResponse:
        """
        Evaluates RAG generation faithfulness, context recall, and hallucination risk.
        Utilizes morphological lemma alignment and token overlap against grounding context documents.
        """
        combined_context = " ".join(request.grounding_contexts).lower()
        context_words = [w for w in re.findall(r'[a-zA-Z0-9_-]{2,}', combined_context)]
        context_stems = {_stem(w) for w in context_words if w not in STOPWORDS}
        
        answer_text = request.answer.lower()
        raw_answer_words = re.findall(r'[a-zA-Z0-9_-]{2,}', answer_text)
        answer_words = [w for w in raw_answer_words if w not in STOPWORDS and len(w) >= 2]

        if not answer_words:
            return EvaluateResponse(
                success=True,
                faithfulness_score=1.0,
                context_recall_score=1.0,
                hallucination_risk="low",
                is_safe=True,
                reasoning="Empty or trivial answer text.",
                matched_citations=[]
            )

        # 1. Faithfulness: proportion of answer claim stems grounded in context stems
        grounded_count = 0
        for w in answer_words:
            st = _stem(w)
            if w in combined_context or st in context_stems:
                grounded_count += 1
            elif any(st in cst or cst in st for cst in context_stems if len(cst) >= 4):
                grounded_count += 1

        faithfulness = round(min(1.0, grounded_count / len(answer_words)), 3)

        # 2. Context Recall: proportion of answer claim concepts grounded in context
        grounded_recall_count = 0
        for w in answer_words:
            st = _stem(w)
            if w in combined_context or st in context_stems:
                grounded_recall_count += 1
            elif any(st in cst or cst in st for cst in context_stems if len(cst) >= 4):
                grounded_recall_count += 1
        recall = round(min(1.0, grounded_recall_count / len(answer_words)), 3)

        # 3. Hallucination Risk Classification
        if faithfulness >= 0.75:
            risk = "low"
            is_safe = True
            reasoning = "Response claims are strongly grounded in retrieved knowledge chunks."
        elif faithfulness >= 0.45:
            risk = "medium"
            is_safe = True
            reasoning = "Response partially supported by context; minor unverified assertions detected."
        else:
            risk = "high"
            is_safe = False
            reasoning = "High hallucination risk: Response contains assertions unsupported by provided knowledge."

        # 4. Matched Citations
        citations: List[str] = []
        for ctx in request.grounding_contexts:
            ctx_lower = ctx.lower()
            overlap = [w for w in answer_words if w in ctx_lower or _stem(w) in context_stems]
            if len(overlap) >= 2:
                preview = ctx[:120] + "..." if len(ctx) > 120 else ctx
                citations.append(preview)

        return EvaluateResponse(
            success=True,
            faithfulness_score=faithfulness,
            context_recall_score=recall,
            hallucination_risk=risk,
            is_safe=is_safe,
            reasoning=reasoning,
            matched_citations=citations[:3]
        )

