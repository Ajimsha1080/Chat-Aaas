import pytest
from app.schemas import EvaluateRequest
from app.services.evaluation_service import EvaluationService
from app.tests.golden_rag_dataset import GOLDEN_RAG_BENCHMARK

@pytest.mark.parametrize("item", GOLDEN_RAG_BENCHMARK, ids=[item["id"] for item in GOLDEN_RAG_BENCHMARK])
def test_golden_rag_benchmark_ground_truth(item):
    """
    Evaluates all 20 Ground-Truth RAG questions against the RAG evaluation engine.
    Ensures hallucination risk is low, faithfulness >= 0.80, and context recall >= 0.80.
    """
    eval_req = EvaluateRequest(
        query=item["query"],
        answer=item["expected_answer"],
        grounding_contexts=[item["grounding_context"]]
    )
    
    result = EvaluationService.evaluate_rag_response(eval_req)
    
    assert result.success is True
    assert result.faithfulness_score >= item["min_faithfulness"], (
        f"Faithfulness score {result.faithfulness_score} fell below minimum required {item['min_faithfulness']} "
        f"for benchmark {item['id']} ({item['category']}). Reasoning: {result.reasoning}"
    )
    assert result.context_recall_score >= item["min_recall"], (
        f"Recall score {result.context_recall_score} fell below minimum required {item['min_recall']} "
        f"for benchmark {item['id']}."
    )
    assert result.hallucination_risk == "low"
    assert result.is_safe is True
    assert len(result.matched_citations) > 0

def test_golden_rag_suite_aggregate_metrics():
    """
    Runs the entire 20-item golden test suite and asserts aggregate accuracy > 85%.
    """
    faithfulness_scores = []
    recall_scores = []
    
    for item in GOLDEN_RAG_BENCHMARK:
        eval_req = EvaluateRequest(
            query=item["query"],
            answer=item["expected_answer"],
            grounding_contexts=[item["grounding_context"]]
        )
        res = EvaluationService.evaluate_rag_response(eval_req)
        faithfulness_scores.append(res.faithfulness_score)
        recall_scores.append(res.context_recall_score)
        
    avg_faithfulness = sum(faithfulness_scores) / len(faithfulness_scores)
    avg_recall = sum(recall_scores) / len(recall_scores)
    
    assert avg_faithfulness >= 0.85, f"Average faithfulness {avg_faithfulness} is below 85% threshold."
    assert avg_recall >= 0.85, f"Average recall {avg_recall} is below 85% threshold."
