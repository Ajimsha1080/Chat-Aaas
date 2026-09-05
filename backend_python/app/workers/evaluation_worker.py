from typing import Dict, Any
from app.services.evaluation_service import EvaluationService
from app.schemas import EvaluateRequest

class EvaluationWorker:
    """
    Offline Asynchronous Worker for RAG Faithfulness & Hallucination Scoring
    """
    @staticmethod
    async def evaluate_conversation_turn(job_payload: Dict[str, Any]) -> Dict[str, Any]:
        req = EvaluateRequest(
            query=job_payload.get("query", ""),
            answer=job_payload.get("answer", ""),
            grounding_contexts=job_payload.get("groundingContexts", []),
            company_id=job_payload.get("companyId")
        )
        res = EvaluationService.evaluate_rag_response(req)
        return {
            "status": "evaluated",
            "faithfulness": res.faithfulness_score,
            "hallucinationRisk": res.hallucination_risk,
            "isSafe": res.is_safe,
            "citations": res.matched_citations
        }
