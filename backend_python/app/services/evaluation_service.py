import re
from typing import List
from app.schemas import EvaluateRequest, EvaluateResponse

class EvaluationService:
    @staticmethod
    def evaluate_rag_response(request: EvaluateRequest) -> EvaluateResponse:
        """
        Evaluates RAG generation faithfulness, context recall, and hallucination risk.
        Compares claim tokens in answer against grounding context documents.
        """
        combined_context = " ".join(request.grounding_contexts).lower()
        answer_text = request.answer.lower()

        # Extract meaningful claim words (ignoring short stopwords)
        stopwords = {
            "the", "a", "an", "is", "are", "and", "or", "in", "on", "at", "to", "for", 
            "with", "this", "that", "it", "of", "as", "by", "from", "you", "your", 
            "can", "get", "will", "be", "we", "our", "us", "do", "does", "have", "has"
        }
        answer_words = [w for w in re.findall(r'\b[a-zA-Z0-9_-]{3,}\b', answer_text) if w not in stopwords]

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

        # Check which claim words are found in context
        grounded_count = sum(1 for w in answer_words if w in combined_context)
        faithfulness = round(grounded_count / len(answer_words), 3)

        # Check query term coverage
        query_terms = [w for w in re.findall(r'\b[a-zA-Z0-9_-]{3,}\b', request.query.lower()) if w not in stopwords]
        recall = 1.0
        if query_terms:
            covered_query = sum(1 for w in query_terms if w in answer_text)
            recall = round(covered_query / len(query_terms), 3)

        # Risk level determination
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

        # Matched citations preview
        citations: List[str] = []
        for ctx in request.grounding_contexts:
            overlap = [w for w in answer_words if w in ctx.lower()]
            if len(overlap) >= 3:
                preview = ctx[:90] + "..." if len(ctx) > 90 else ctx
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
