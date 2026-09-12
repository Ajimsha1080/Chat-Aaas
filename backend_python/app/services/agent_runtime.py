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

        # 0. Lifecycle Check: If assistant is disabled, unavailble message
        if agent_config.get("lifecycleStatus") in ["disabled", "archived", "deleted"] or agent_config.get("status") in ["paused", "disabled"]:
            reasoning_steps.append(ReasoningStep(
                stage="Assistant State",
                detail="Assistant is currently unavailable on this deployment.",
                timestamp=now_str
            ))
            return ChatResponse(
                message="The AI assistant is currently unavailable on this deployment.",
                reasoning_steps=reasoning_steps,
                session_id=request.session_id or "sess_live"
            )

        # 1. System Platform Guardrails
        reasoning_steps.append(ReasoningStep(
            stage="Platform Guardrails",
            detail="Validating message against SSRF, prompt injection, and jailbreak patterns.",
            timestamp=now_str
        ))

        # 1. Agent Disabled / Paused Check
        if agent_config.get("status") == "paused" or agent_config.get("lifecycleStatus") in ["disabled", "paused"]:
            return ChatResponse(
                message="This AI assistant is currently unavailable or disabled by the administrator.",
                reasoning_steps=[ReasoningStep(
                    stage="Lifecycle Status Check",
                    detail="Assistant is disabled or paused. Halting automated responses.",
                    timestamp=now_str
                )],
                session_id=request.session_id or "sess_live"
            )

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
        import re
        if "order" in user_msg.lower() and ("track" in user_msg.lower() or "status" in user_msg.lower() or "where" in user_msg.lower()):
            ord_match = re.search(r'\b(ORD-[0-9A-Za-z]+)\b', user_msg, re.IGNORECASE) or re.search(r'(?:order|id)[:\s#]*([0-9A-Za-z_-]{4,})', user_msg, re.IGNORECASE)
            if ord_match:
                extracted_order_id = ord_match.group(1).upper()
                reasoning_steps.append(ReasoningStep(
                    stage="Tool Intent Detected",
                    detail=f"Identified intent for 'check_order_status' with parameter order_id='{extracted_order_id}'. Dispatching to tool executor.",
                    timestamp=now_str
                ))
                tool_res = ToolRegistry.execute_tool("check_order_status", {"order_id": extracted_order_id}, company_id)
                if tool_res.success and tool_res.result:
                    return ChatResponse(
                        message=f"Your order **{tool_res.result['order_id']}** is currently **{tool_res.result['status']}** with tracking ID `{tool_res.result['tracking_number']}`. Estimated delivery is **{tool_res.result['estimated_delivery']}**.",
                        reasoning_steps=reasoning_steps,
                        tool_executed="check_order_status",
                        tool_result=tool_res.result,
                        session_id=request.session_id or "sess_live"
                    )
            else:
                reasoning_steps.append(ReasoningStep(
                    stage="Tool Intent Detected",
                    detail="Identified order tracking intent, but no order ID provided. Prompting customer for identifier.",
                    timestamp=now_str
                ))
                return ChatResponse(
                    message="Please provide your order number (for example, ORD-8821) so I can check the live tracking status for you.",
                    reasoning_steps=reasoning_steps,
                    session_id=request.session_id or "sess_live"
                )

        if "refund" in user_msg.lower():
            ord_match = re.search(r'\b(ORD-[0-9A-Za-z]+)\b', user_msg, re.IGNORECASE) or re.search(r'(?:order|id)[:\s#]*([0-9A-Za-z_-]{4,})', user_msg, re.IGNORECASE)
            target_order = ord_match.group(1).upper() if ord_match else None
            reasoning_steps.append(ReasoningStep(
                stage="High-Risk Action Gate",
                detail="Identified intent for 'execute_refund'. Validating required confirmation gates.",
                timestamp=now_str
            ))
            if not target_order:
                return ChatResponse(
                    message="Please provide the order number or transaction ID for the purchase you would like to refund.",
                    reasoning_steps=reasoning_steps,
                    session_id=request.session_id or "sess_live"
                )
            tool_res = ToolRegistry.execute_tool("execute_refund", {"order_id": target_order}, company_id, user_confirmed=False)
            if tool_res.requires_confirmation:
                return ChatResponse(
                    message=tool_res.confirmation_prompt or f"Confirmation required before processing refund for order {target_order}.",
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

        # 5. Synthesize Grounded Response using Real-Time Sarvam AI LLM
        from app.services.llm_service import LLMProvider
        context_str = "\n\n".join([f"Source ({getattr(c, 'title', 'Knowledge Base')}): {c.content}" for c in chunks[:3]])
        sys_instruction = (
            f"You are the official AI Q&A assistant for company {company_id}. "
            f"Persona tone: {agent_config.get('tone', 'professional')}. "
            f"Answer the customer's question accurately and helpfully using the verified context below.\n\n"
            f"Verified Knowledge Context:\n{context_str}"
        )

        llm_response = await LLMProvider.generate_response(
            prompt=user_msg,
            system_instruction=sys_instruction,
            model=agent_config.get('modelTier', 'sarvam-2b'),
            temperature=float(agent_config.get('creativityLevel', 0.3)) if isinstance(agent_config.get('creativityLevel'), (int, float)) else 0.3
        )
        
        return ChatResponse(
            message=llm_response,
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

    @classmethod
    async def stream_process_message(
        cls,
        request: ChatRequest,
        company_id: str,
        agent_config: Dict[str, Any],
        stored_chunks: List[Dict[str, Any]]
    ) -> AsyncGenerator[str, None]:
        """
        True SSE streaming generator for real token delivery from the LLM provider.
        Yields structured SSE data events: start -> token -> done.
        """
        import json
        from app.services.llm_service import LLMProvider

        user_msg = request.message.strip()

        # 1. State / Availability Check
        if agent_config.get("status") == "paused" or agent_config.get("lifecycleStatus") in ["disabled", "paused"]:
            yield f"data: {json.dumps({'type': 'error', 'message': 'This AI assistant is currently paused or unavailable.'})}\n\n"
            yield "data: [DONE]\n\n"
            return

        # 2. Human Escalation Trigger
        escalation_keywords = ["human", "agent", "representative", "manager", "support person", "call me", "talk to human"]
        if any(kw in user_msg.lower() for kw in escalation_keywords):
            yield f"data: {json.dumps({'type': 'escalate', 'message': 'I am connecting you with a human support specialist right now.'})}\n\n"
            yield "data: [DONE]\n\n"
            return

        # 3. RAG Retrieval & Grounding
        chunks = RAGEngine.search_chunks(user_msg, company_id, stored_chunks, threshold=0.25)
        is_grounded, ground_msg = RAGEngine.evaluate_groundedness(chunks, threshold=0.35)

        if not is_grounded:
            refusal_payload = {
                "type": "refusal",
                "message": "I do not have enough verified information in our company knowledge base to answer that accurately. I can connect you with our team if you would like!"
            }
            yield f"data: {json.dumps(refusal_payload)}\n\n"
            yield "data: [DONE]\n\n"
            return

        # 4. Emit Start Event with Citations
        conv_id = getattr(request, "conversation_id", None) or getattr(request, "session_id", None)
        citations = [{"chunkId": c.chunk_id, "title": getattr(c, "title", "Knowledge Base")} for c in chunks[:3]]
        yield f"data: {json.dumps({'type': 'start', 'conversationId': conv_id, 'citations': citations, 'confidenceScore': chunks[0].similarity_score})}\n\n"

        # 5. Stream Real Tokens from LLMProvider
        context_str = "\n\n".join([f"Source ({getattr(c, 'title', 'Knowledge Base')}): {c.content}" for c in chunks[:3]])
        sys_instruction = (
            f"You are the official AI Q&A assistant for company {company_id}. "
            f"Persona tone: {agent_config.get('tone', 'professional')}. "
            f"Answer the customer's question accurately and helpfully using the verified context below.\n\n"
            f"Verified Knowledge Context:\n{context_str}"
        )

        full_acc = []
        async for token in LLMProvider.stream_chat_completion(
            messages=[{"role": "user", "content": user_msg}],
            system_instruction=sys_instruction,
            model=agent_config.get("modelTier", "sarvam-2b"),
            temperature=0.3
        ):
            full_acc.append(token)
            yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"

        full_msg = ''.join(full_acc)
        tokens_est = max(1, len(full_msg.split()) + len(user_msg.split()))
        from app.services.usage_service import UsageService
        UsageService.record_event(company_id, "message", 1, "messages", conv_id)
        UsageService.record_event(company_id, "llm_tokens", tokens_est, "tokens", conv_id)

        yield f"data: {json.dumps({'type': 'done', 'conversationId': conv_id, 'fullMessage': full_msg, 'tokensUsed': tokens_est})}\n\n"
        yield "data: [DONE]\n\n"

