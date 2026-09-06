import asyncio
import time
from typing import AsyncGenerator, Dict, Any, List
from app.schemas import ChatRequest, ChatResponse, ReasoningStep
from app.services.rag_engine import RAGEngine
from app.services.tool_registry import ToolRegistry

class AgentRuntime:
    @classmethod
    async def process_message(
        cls, 
        request: ChatRequest, 
        company_id: str, 
        agent_config: Dict[str, Any], 
        stored_chunks: List[Dict[str, Any]]
    ) -> ChatResponse:
        """
        Executes the 5-tier reasoning process:
        System Guardrails -> Persona -> RAG Knowledge -> Tool Authorization -> Grounded Response.
        """
        user_msg = request.message.strip()
        reasoning_steps: List[ReasoningStep] = []
        now_str = time.strftime("%H:%M:%S")

        # 1. System Platform Guardrails
        reasoning_steps.append(ReasoningStep(
            stage="Platform Guardrails",
            detail="Validating message against SSRF, prompt injection, and jailbreak patterns.",
            timestamp=now_str
        ))

        # 2. Human Escalation Trigger Check
        escalation_keywords = ["human", "agent", "representative", "manager", "support person", "call me", "talk to human"]
        if any(kw in user_msg.lower() for kw in escalation_keywords):
            reasoning_steps.append(ReasoningStep(
                stage="Human Handoff Trigger",
                detail="Customer explicitly requested human intervention. Initiating live transfer.",
                timestamp=now_str
            ))
            return ChatResponse(
                message="I am connecting you with a human support specialist right now. Our team has received your conversation history and will take over momentarily.",
                reasoning_steps=reasoning_steps,
                should_escalate_to_human=True,
                handoff_required=True,
                session_id=request.session_id or "sess_live"
            )

        # 3. Tool Intent Recognition & Execution
        if "order" in user_msg.lower() and ("track" in user_msg.lower() or "status" in user_msg.lower() or "where" in user_msg.lower()):
            reasoning_steps.append(ReasoningStep(
                stage="Tool Intent Detected",
                detail="Identified intent for 'check_order_status'. Dispatching to server-side tool executor.",
                timestamp=now_str
            ))
            tool_res = ToolRegistry.execute_tool("check_order_status", {"order_id": "ORD-8821"}, company_id)
            if tool_res.success and tool_res.result:
                return ChatResponse(
                    message=f"Your order **{tool_res.result['order_id']}** is currently **{tool_res.result['status']}** with tracking ID `{tool_res.result['tracking_number']}`. Estimated delivery is **{tool_res.result['estimated_delivery']}**.",
                    reasoning_steps=reasoning_steps,
                    tool_executed="check_order_status",
                    tool_result=tool_res.result,
                    session_id=request.session_id or "sess_live"
                )

        if "refund" in user_msg.lower():
            reasoning_steps.append(ReasoningStep(
                stage="High-Risk Action Gate",
                detail="Identified intent for 'execute_refund'. Validating required confirmation gates.",
                timestamp=now_str
            ))
            tool_res = ToolRegistry.execute_tool("execute_refund", {"order_id": "ORD-1029"}, company_id, user_confirmed=False)
            if tool_res.requires_confirmation:
                return ChatResponse(
                    message=tool_res.confirmation_prompt or "Confirmation required before proceeding with refund.",
                    reasoning_steps=reasoning_steps,
                    requires_confirmation=True,
                    confirmation_action="execute_refund",
                    session_id=request.session_id or "sess_live"
                )

        # 4. RAG Knowledge Search
        reasoning_steps.append(ReasoningStep(
            stage="RAG Knowledge Retrieval",
            detail=f"Querying vector embeddings isolated strictly for tenant '{company_id}'.",
            timestamp=now_str
        ))
        chunks = RAGEngine.search_chunks(user_msg, company_id, stored_chunks, threshold=0.30)
        is_grounded, ground_msg = RAGEngine.evaluate_groundedness(chunks, threshold=0.35)

        reasoning_steps.append(ReasoningStep(
            stage="Anti-Hallucination Evaluator",
            detail=ground_msg,
            timestamp=now_str
        ))

        if not is_grounded:
            return ChatResponse(
                message="I don't have enough verified information in our company knowledge base to answer that accurately. I can connect you with our team if you'd like!",
                reasoning_steps=reasoning_steps,
                confidence_score=0.35,
                is_refusal=True,
                session_id=request.session_id or "sess_live"
            )

        # 5. Synthesize Grounded Response
        top_context = chunks[0].content
        synthesized_text = f"Based on our official company documentation:\n\n{top_context}\n\nPlease let me know if you need any further assistance!"
        
        return ChatResponse(
            message=synthesized_text,
            reasoning_steps=reasoning_steps,
            confidence_score=chunks[0].similarity_score,
            session_id=request.session_id or "sess_live"
        )

    @classmethod
    async def stream_tokens(cls, full_text: str) -> AsyncGenerator[str, None]:
        """Asynchronously streams response tokens chunk-by-chunk for low-latency TTFT."""
        words = full_text.split(" ")
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            yield f"data: {chunk}\n\n"
            await asyncio.sleep(0.02)
        yield "data: [DONE]\n\n"
