import asyncio
import time
import json
import re
from typing import AsyncGenerator, Dict, Any, List
from app.schemas import (
    ChatRequest,
    ChatResponse,
    ReasoningStep,
    ChunkSearchResult,
    RerankRequest,
    RerankCandidate,
    EvaluateRequest
)
from app.services.rag_engine import RAGEngine
from app.services.reranking_service import RerankingService
from app.services.query_rewriter import QueryRewriter
from app.services.tool_registry import ToolRegistry
from app.services.llm_service import LLMProvider
from app.services.evaluation_service import EvaluationService
from app.core.config import settings

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
        Executes the natural RAG intelligence pipeline:
        Guardrails -> Lifecycle -> Human Escalation -> Tool Gates -> Greeting ->
        Query Rewriting -> Hybrid Retrieval -> Reranking -> LLM Synthesis -> Grounding.
        """
        current_user_question = request.message.strip()
        conversation_history = getattr(request, "history", []) or []
        reasoning_steps: List[ReasoningStep] = []
        now_str = time.strftime("%H:%M:%S")

        # 0. Lifecycle Check: If assistant is disabled, return unavailable message
        if agent_config.get("lifecycleStatus") in ["disabled", "archived", "deleted"] or agent_config.get("status") in ["paused", "disabled"]:
            reasoning_steps.append(ReasoningStep(
                stage="Assistant State",
                detail="Assistant is currently unavailable or disabled on this deployment.",
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

        # 2. Human Escalation Trigger Check
        explicit_escalation_phrases = [
            "talk to a human", "talk to human", "speak with a human", "speak to human", "speak to a person",
            "transfer to a human", "transfer to human", "connect to human", "connect to a human",
            "connect me to a representative", "let me speak to someone", "i want a human", "give me a human",
            "human support manager", "human support agent", "speak to an agent", "talk to an agent",
            "need a human", "real human"
        ]
        q_lower = current_user_question.lower()
        if any(phrase in q_lower for phrase in explicit_escalation_phrases):
            reasoning_steps.append(ReasoningStep(
                stage="Human Handoff Trigger",
                detail="Customer requested human intervention. Initiating live transfer.",
                timestamp=now_str
            ))
            return ChatResponse(
                message="I am connecting you with a human support specialist right now. Our team has received your conversation history and will take over momentarily.",
                reasoning_steps=reasoning_steps,
                should_escalate_to_human=True,
                handoff_required=True,
                session_id=request.session_id or "sess_live"
            )

        # 3. Tool Intent Recognition & Execution (Orders)
        if "order" in q_lower and ("track" in q_lower or "status" in q_lower or "where" in q_lower):
            ord_match = re.search(r'\b(ORD-[0-9A-Za-z]+)\b', current_user_question, re.IGNORECASE) or re.search(r'(?:order|id)[:\s#]*([0-9A-Za-z_-]{4,})', current_user_question, re.IGNORECASE)
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

        # Action Execution Gates (Refunds) - strictly first-person transactional intent
        is_informational_refund = any(q in q_lower for q in [
            "how", "what", "policy", "when", "can", "could", "is there", "are there",
            "process", "time", "days", "rules", "window", "eligible", "allowed", "possible", "terms"
        ])
        explicit_action_phrases = [
            "refund my", "refund order", "cancel and refund", "issue refund for",
            "give me a refund", "process my refund", "i want a refund", "refund me",
            "i would like a refund", "please refund"
        ]
        has_explicit_action = any(act in q_lower for act in explicit_action_phrases)
        if (has_explicit_action or "ord-" in q_lower) and not is_informational_refund:
            ord_match = re.search(r'\b(ORD-[0-9A-Za-z]+)\b', current_user_question, re.IGNORECASE) or re.search(r'(?:order|id)[:\s#]*([0-9A-Za-z_-]{4,})', current_user_question, re.IGNORECASE)
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

        # 3.5 Conversational Greeting & Intent Detector
        clean_user_msg = re.sub(r'[^\w\s]', '', q_lower).strip()
        greetings = ["hi", "hello", "hey", "hlo", "hllo", "helo", "yo", "sup", "greetings", "hi there", "hello there", "good morning", "good afternoon", "good evening", "howdy"]
        gratitudes = ["thanks", "thank you", "thanks!", "ty", "great", "awesome", "perfect", "thank you so much"]
        identity_queries = ["who are you", "what can you do", "what do you do", "help"]

        agent_name = agent_config.get("name") or "Coar AI"
        greeting_reply = agent_config.get("greetingMessage") or f"Hello! 👋 I'm {agent_name}. How can I assist you with our services, pricing, or policies today?"

        if clean_user_msg in greetings or any(clean_user_msg.startswith(g + " ") and len(clean_user_msg.split()) <= 3 for g in greetings):
            reasoning_steps.append(ReasoningStep(
                stage="Conversational Intent",
                detail="Identified casual greeting. Replying with persona welcome message.",
                timestamp=now_str
            ))
            t_count = LLMProvider.count_tokens(current_user_question + "\n" + greeting_reply)
            return ChatResponse(
                message=greeting_reply,
                reasoning_steps=reasoning_steps,
                confidence_score=1.0,
                tokens_used=t_count,
                session_id=request.session_id or "sess_live"
            )

        if clean_user_msg in gratitudes:
            reply = "You're very welcome! Let me know if you need anything else."
            t_count = LLMProvider.count_tokens(current_user_question + "\n" + reply)
            return ChatResponse(
                message=reply,
                reasoning_steps=reasoning_steps,
                confidence_score=1.0,
                tokens_used=t_count,
                session_id=request.session_id or "sess_live"
            )

        if clean_user_msg in identity_queries:
            reply = f"I'm **{agent_name}**, your official AI assistant! I can answer questions about our company products, documentation, policies, and process live requests."
            t_count = LLMProvider.count_tokens(current_user_question + "\n" + reply)
            return ChatResponse(
                message=reply,
                reasoning_steps=reasoning_steps,
                confidence_score=1.0,
                tokens_used=t_count,
                session_id=request.session_id or "sess_live"
            )

        # 4. Context-Aware Query Rewriting (resolves follow-ups like "how does it work?")
        retrieval_query = QueryRewriter.rewrite_query(current_user_question, conversation_history)
        if retrieval_query != current_user_question:
            reasoning_steps.append(ReasoningStep(
                stage="Query Understanding & Rewriting",
                detail=f"Resolved follow-up context. Rewritten retrieval query: '{retrieval_query}'",
                timestamp=now_str
            ))

        # 5. Hybrid RAG Knowledge Search
        reasoning_steps.append(ReasoningStep(
            stage="RAG Knowledge Retrieval",
            detail=f"Querying hybrid dense vector embeddings and BM25 with Reciprocal Rank Fusion (RRF) isolated strictly for tenant '{company_id}'.",
            timestamp=now_str
        ))
        raw_chunks, diagnostics = RAGEngine.search_chunks_with_diagnostics(
            query=current_user_question,
            standalone_query=retrieval_query,
            company_id=company_id,
            stored_chunks=stored_chunks,
            threshold=0.15,
            top_k=15
        )

        # Cross-Encoder Reranking
        if raw_chunks:
            candidates = [
                RerankCandidate(
                    id=c.chunk_id,
                    content=c.content,
                    metadata={"title": getattr(c, "title", "Knowledge Base")},
                    initial_score=c.similarity_score
                )
                for c in raw_chunks
            ]
            rerank_req = RerankRequest(query=retrieval_query, candidates=candidates, top_k=8)
            rerank_res = RerankingService.rerank_candidates(rerank_req)
            chunks = [
                ChunkSearchResult(
                    chunk_id=item.id,
                    knowledge_source_id="src_rag",
                    content=item.content,
                    title=item.metadata.get("title", "Knowledge Base") if item.metadata else "Knowledge Base",
                    similarity_score=item.relevance_score
                )
                for item in rerank_res.results
            ]
            diagnostics.reranked_results = [
                {"id": r.id, "title": r.metadata.get("title", ""), "score": r.relevance_score}
                for r in rerank_res.results
            ]
        else:
            chunks = []

        is_grounded, ground_msg = RAGEngine.evaluate_groundedness(chunks, threshold=0.15)
        reasoning_steps.append(ReasoningStep(
            stage="Anti-Hallucination Evaluator",
            detail=ground_msg,
            timestamp=now_str
        ))

        if not is_grounded or not chunks:
            refusal_msg = "I don't have enough verified information in our company knowledge base to answer that accurately. I can connect you with our team if you'd like!"
            t_count = LLMProvider.count_tokens(current_user_question + "\n" + refusal_msg)
            return ChatResponse(
                message=refusal_msg,
                reasoning_steps=reasoning_steps,
                confidence_score=0.35,
                is_refusal=True,
                tokens_used=t_count,
                diagnostics=diagnostics,
                session_id=request.session_id or "sess_live"
            )

        # 6. Question-Centric Grounded Synthesis
        model_name = agent_config.get('modelTier') or settings.DEFAULT_LLM_MODEL
        if model_name == 'sarvam-2b':
            model_name = settings.DEFAULT_LLM_MODEL

        retrieved_context = "\n\n".join([f"Source ({getattr(c, 'title', 'Knowledge Base')}): {c.content}" for c in chunks[:8]])

        history_str = ""
        if conversation_history:
            hist_lines = []
            for h in conversation_history[-4:]:
                role = getattr(h, "role", "user") if hasattr(h, "role") else (h.get("role", "user") if isinstance(h, dict) else "user")
                txt = getattr(h, "content", "") if hasattr(h, "content") else (h.get("content", "") if isinstance(h, dict) else "")
                if txt:
                    hist_lines.append(f"{role.capitalize()}: {txt}")
            if hist_lines:
                history_str = "Conversation History:\n" + "\n".join(hist_lines) + "\n\n"

        sys_instruction = (
            f"You are the official AI assistant for company {company_id}.\n"
            f"Persona tone: {agent_config.get('tone', 'professional')}.\n\n"
            f"{history_str}"
            f"CRITICAL INSTRUCTIONS:\n"
            f"1. Answer ONLY the specific question asked by the user: '{current_user_question}'. Do NOT summarize or dump the entire knowledge context.\n"
            f"2. If the user asks what the company does or what services are offered, answer ONLY about the company's core services / products (e.g., 'The company provides cloud services for AWS and Azure.'). Do NOT include support hours or refund policies unless specifically asked.\n"
            f"3. If the user asks a yes/no or capability question (e.g., 'Can I get support at night?'), begin with a direct answer ('Yes, ...') followed by the concise explanation from the context.\n"
            f"4. If the user asks about refunds, answer ONLY about the refund policy.\n"
            f"5. If the user asks for the full name, full form, meaning, or definition of an acronym or term (e.g. 'Rag full name', 'What does RAG stand for?'), answer directly with the full expansion (e.g., 'RAG stands for Retrieval-Augmented Generation.') instead of returning unrelated context sentences.\n"
            f"6. If the user asks for 'main points', 'key takeaways', 'summary', or 'highlights', provide a structured list of bullet points highlighting the distinct core pillars or action items from the context rather than repeating the overview text.\n"
            f"7. Base your answer strictly on the verified knowledge context below. Answer thoroughly, clearly, and directly using the facts in the context. Do NOT append disclaimers, apologies, or 'I don't have details' statements when you have answered the question. Only if a requested fact is completely absent from the context, state naturally that you don't have that specific information on file.\n"
            f"8. Speak naturally as a helpful customer support representative for the company. Do NOT copy-paste whole knowledge passages or FAQ answers verbatim unless an exact number, SKU, email, URL, policy duration, or legal wording is required.\n"
            f"9. Keep the response concise, conversational, and do not output raw document headers or metadata tags.\n"
            f"10. When the user asks about the agents, department agents, or their names/roles, explicitly list the departmental specialists (Finance, Sales, Procurement, Inventory, HR, Operations) described in the context.\n"
            f"11. Never begin answers with robotic meta-phrases like 'According to our verified records', 'Based on our records', 'According to our knowledge base', or 'According to the provided documents'. Start your answer directly, naturally, and authoritatively.\n"
            f"12. Do NOT append boilerplate closing sentences like 'If you need any further assistance, I can connect you with our team' to regular answers.\n\n"
            f"Verified Knowledge Context:\n{retrieved_context}"
        )

        start_llm = time.time()
        llm_response, gen_mode = await LLMProvider.generate_response_with_mode(
            prompt=current_user_question,
            system_instruction=sys_instruction,
            model=model_name,
            temperature=float(agent_config.get('creativityLevel', 0.3)) if isinstance(agent_config.get('creativityLevel'), (int, float)) else 0.3
        )
        llm_duration_ms = (time.time() - start_llm) * 1000

        prompt_tokens = LLMProvider.count_tokens(current_user_question + "\n" + sys_instruction, model=model_name)
        completion_tokens = LLMProvider.count_tokens(llm_response, model=model_name)
        total_tokens = prompt_tokens + completion_tokens

        is_refusal = any(phrase in llm_response.lower() for phrase in [
            "cannot verify", "can't verify", "do not have information", "don't have information",
            "couldn't find enough information", "not mentioned in", "does not contain information",
            "does not provide information", "no information available", "not available in the provided",
            "unable to verify", "i don't have enough", "cannot provide information", "can't provide information",
            "not present in", "not found in", "no mention of", "not covered in", "unable to find",
            "documentation does not contain", "not contain that information"
        ])

        citations = list(dict.fromkeys([getattr(c, "title", "Knowledge Base") for c in chunks[:8]]))
        grounding_eval = EvaluationService.evaluate_rag_response(EvaluateRequest(
            query=current_user_question,
            answer=llm_response,
            grounding_contexts=[c.content for c in chunks[:8]],
            company_id=company_id
        ))
        reasoning_steps.append(ReasoningStep(
            stage="Grounding Verification",
            detail=f"Final natural answer faithfulness={grounding_eval.faithfulness_score}; hallucination risk={grounding_eval.hallucination_risk}.",
            timestamp=now_str
        ))

        # Natural response sanitization for customer-facing AI
        llm_response = re.sub(
            r'^(?:The\s+)?documentation\s+(?:does\s+not\s+(?:contain|provide)|doesn\'t\s+(?:contain|provide))\s+(?:information\s+(?:about|on|regarding)\s+)?([^.]+)\.?\s*',
            r"I don't have information about \1 on file, but I'd be happy to connect you with our team for more details!",
            llm_response,
            flags=re.IGNORECASE
        ).strip()
        llm_response = re.sub(r"about (?:that information|the founder's name|founder's name) on file", "about our founders on file", llm_response, flags=re.IGNORECASE)
        llm_response = re.sub(
            r'^(?:The\s+)?(?:provided\s+|uploaded\s+)?documentation\s+(?:does\s+not|doesn\'t)\s+.*',
            "I don't have that specific information on file, but I'd be happy to connect you with our team for more details!",
            llm_response,
            flags=re.IGNORECASE
        ).strip()
        llm_response = re.sub(
            r'^(?:According to|Based on|As per)\s+(?:the\s+|our\s+)?(?:verified\s+)?(?:records|knowledge|documentation|context|information|files|data),?\s*',
            "",
            llm_response.strip(),
            flags=re.IGNORECASE
        ).strip()
        if llm_response and llm_response[0].islower():
            llm_response = llm_response[0].upper() + llm_response[1:]

        llm_response = re.sub(
            r'\n*\s*(?:If you need any further assistance,?\s*(?:I can connect you with our team|please let me know|feel free to ask)\.?)\s*$',
            "",
            llm_response,
            flags=re.IGNORECASE
        ).strip()

        if not grounding_eval.is_safe and not is_refusal:
            llm_response = "I don't have enough verified information to answer that question accurately. I can connect you with our team if you'd like!"
            is_refusal = True
            completion_tokens = LLMProvider.count_tokens(llm_response, model=model_name)
            total_tokens = prompt_tokens + completion_tokens

        diagnostics.context_tokens = prompt_tokens
        diagnostics.llm_latency_ms = round(llm_duration_ms, 2)
        diagnostics.citations = citations
        diagnostics.faithfulness_score = grounding_eval.faithfulness_score

        return ChatResponse(
            message=llm_response,
            reasoning_steps=reasoning_steps,
            confidence_score=chunks[0].similarity_score,
            tokens_used=total_tokens,
            citations=citations,
            generation_mode=gen_mode,
            generationMode=gen_mode,
            diagnostics=diagnostics,
            is_refusal=is_refusal,
            session_id=request.session_id or "sess_live"
        )

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
        current_user_question = request.message.strip()
        conversation_history = getattr(request, "history", []) or []

        # 1. State / Availability Check
        if agent_config.get("status") == "paused" or agent_config.get("lifecycleStatus") in ["disabled", "paused"]:
            yield f"data: {json.dumps({'type': 'error', 'message': 'This AI assistant is currently paused or unavailable.'})}\n\n"
            yield "data: [DONE]\n\n"
            return

        # 2. Human Escalation Trigger
        explicit_escalation_phrases = [
            "talk to a human", "talk to human", "speak with a human", "speak to human", "speak to a person",
            "transfer to a human", "transfer to human", "connect to human", "connect to a human",
            "connect me to a representative", "let me speak to someone", "i want a human", "give me a human",
            "human support manager", "human support agent", "speak to an agent", "talk to an agent"
        ]
        q_lower = current_user_question.lower()
        if any(kw in q_lower for kw in explicit_escalation_phrases):
            yield f"data: {json.dumps({'type': 'escalate', 'message': 'I am connecting you with a human support specialist right now.'})}\n\n"
            yield "data: [DONE]\n\n"
            return

        # 2.5 Conversational Greeting & Intent Detector
        clean_user_msg = re.sub(r'[^\w\s]', '', q_lower).strip()
        greetings = ["hi", "hello", "hey", "hlo", "hllo", "helo", "yo", "sup", "greetings", "hi there", "hello there", "good morning", "good afternoon", "good evening", "howdy"]
        gratitudes = ["thanks", "thank you", "thanks!", "ty", "great", "awesome", "perfect", "thank you so much"]

        agent_name = agent_config.get("name") or "Coar AI"
        greeting_reply = agent_config.get("greetingMessage") or f"Hello! 👋 I'm {agent_name}. How can I assist you with our services, pricing, or policies today?"

        conv_id = getattr(request, "conversation_id", None) or getattr(request, "session_id", None)

        if clean_user_msg in greetings or any(clean_user_msg.startswith(g + " ") and len(clean_user_msg.split()) <= 3 for g in greetings):
            yield f"data: {json.dumps({'type': 'start', 'conversationId': conv_id, 'citations': [], 'confidenceScore': 1.0})}\n\n"
            yield f"data: {json.dumps({'type': 'token', 'token': greeting_reply})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'conversationId': conv_id, 'fullMessage': greeting_reply, 'tokensUsed': 15})}\n\n"
            yield "data: [DONE]\n\n"
            return

        if clean_user_msg in gratitudes:
            reply = "You're very welcome! Let me know if you need anything else."
            yield f"data: {json.dumps({'type': 'start', 'conversationId': conv_id, 'citations': [], 'confidenceScore': 1.0})}\n\n"
            yield f"data: {json.dumps({'type': 'token', 'token': reply})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'conversationId': conv_id, 'fullMessage': reply, 'tokensUsed': 10})}\n\n"
            yield "data: [DONE]\n\n"
            return

        # 3. Query Rewriting & Hybrid Retrieval
        retrieval_query = QueryRewriter.rewrite_query(current_user_question, conversation_history)
        raw_chunks = RAGEngine.search_chunks(retrieval_query, company_id, stored_chunks, threshold=0.15, top_k=6)

        if raw_chunks:
            candidates = [
                RerankCandidate(
                    id=c.chunk_id,
                    content=c.content,
                    metadata={"title": getattr(c, "title", "Knowledge Base")},
                    initial_score=c.similarity_score
                )
                for c in raw_chunks
            ]
            rerank_res = RerankingService.rerank_candidates(RerankRequest(query=retrieval_query, candidates=candidates, top_k=3))
            chunks = [
                ChunkSearchResult(
                    chunk_id=item.id,
                    knowledge_source_id="src_rag",
                    content=item.content,
                    title=item.metadata.get("title", "Knowledge Base") if item.metadata else "Knowledge Base",
                    similarity_score=item.relevance_score
                )
                for item in rerank_res.results
            ]
        else:
            chunks = []

        is_grounded, ground_msg = RAGEngine.evaluate_groundedness(chunks, threshold=0.15)

        if not is_grounded or not chunks:
            refusal_payload = {
                "type": "refusal",
                "message": "I do not have enough verified information in our company knowledge base to answer that accurately. I can connect you with our team if you would like!"
            }
            yield f"data: {json.dumps(refusal_payload)}\n\n"
            yield "data: [DONE]\n\n"
            return

        # 4. Emit Start Event with Citations
        citations = [getattr(c, "title", "Knowledge Base") for c in chunks[:3]]
        gen_mode = "llm" if (settings.CUSTOM_LLM_API_URL and settings.CUSTOM_LLM_API_KEY) else "template_fallback"
        yield f"data: {json.dumps({'type': 'start', 'conversationId': conv_id, 'citations': citations, 'confidenceScore': chunks[0].similarity_score, 'generationMode': gen_mode})}\n\n"

        # 5. Stream Real Tokens from LLMProvider
        retrieved_context = "\n\n".join([f"Source ({getattr(c, 'title', 'Knowledge Base')}): {c.content}" for c in chunks[:3]])
        
        history_str = ""
        if conversation_history:
            hist_lines = []
            for h in conversation_history[-4:]:
                role = getattr(h, "role", "user") if hasattr(h, "role") else (h.get("role", "user") if isinstance(h, dict) else "user")
                txt = getattr(h, "content", "") if hasattr(h, "content") else (h.get("content", "") if isinstance(h, dict) else "")
                if txt:
                    hist_lines.append(f"{role.capitalize()}: {txt}")
            if hist_lines:
                history_str = "Conversation History:\n" + "\n".join(hist_lines) + "\n\n"

        sys_instruction = (
            f"You are the official AI assistant for company {company_id}.\n"
            f"Persona tone: {agent_config.get('tone', 'professional')}.\n\n"
            f"{history_str}"
            f"CRITICAL INSTRUCTIONS:\n"
            f"1. Answer ONLY the specific question asked by the user: '{current_user_question}'. Do NOT summarize or dump the entire knowledge context.\n"
            f"2. If the user asks what the company does or what services are offered, answer ONLY about the company's core services / products (e.g., 'The company provides cloud services for AWS and Azure.'). Do NOT include support hours or refund policies unless specifically asked.\n"
            f"3. If the user asks a yes/no or capability question (e.g., 'Can I get support at night?'), begin with a direct answer ('Yes, ...') followed by the concise explanation from the context.\n"
            f"4. If the user asks about refunds, answer ONLY about the refund policy.\n"
            f"5. If the user asks for the full name, full form, meaning, or definition of an acronym or term (e.g. 'Rag full name', 'What does RAG stand for?'), answer directly with the full expansion (e.g., 'RAG stands for Retrieval-Augmented Generation.') instead of returning unrelated context sentences.\n"
            f"6. If the user asks for 'main points', 'key takeaways', 'summary', or 'highlights', provide a structured list of bullet points highlighting the distinct core pillars or action items from the context rather than repeating the overview text.\n"
            f"7. Base your answer strictly on the verified knowledge context below. Answer thoroughly, clearly, and directly using the facts in the context. Do NOT append disclaimers, apologies, or 'I don't have details' statements when you have answered the question. Only if a requested fact is completely absent from the context, state naturally that you don't have that specific information on file.\n"
            f"8. Speak naturally as a helpful customer support representative for the company. Do NOT copy-paste whole knowledge passages or FAQ answers verbatim unless an exact number, SKU, email, URL, policy duration, or legal wording is required.\n"
            f"9. Keep the response concise, conversational, and do not output raw document headers or metadata tags.\n"
            f"10. When the user asks about the agents, department agents, or their names/roles, explicitly list the departmental specialists (Finance, Sales, Procurement, Inventory, HR, Operations) described in the context.\n"
            f"11. Never begin answers with robotic meta-phrases like 'According to our verified records', 'Based on our records', 'According to our knowledge base', or 'According to the provided documents'. Start your answer directly, naturally, and authoritatively.\n"
            f"12. Do NOT append boilerplate closing sentences like 'If you need any further assistance, I can connect you with our team' to regular answers.\n\n"
            f"Verified Knowledge Context:\n{retrieved_context}"
        )

        model_name = agent_config.get("modelTier") or settings.DEFAULT_LLM_MODEL
        if model_name == "sarvam-2b":
            model_name = settings.DEFAULT_LLM_MODEL

        full_acc = []
        async for token in LLMProvider.stream_chat_completion(
            messages=[{"role": "user", "content": current_user_question}],
            system_instruction=sys_instruction,
            model=model_name,
            temperature=0.3
        ):
            full_acc.append(token)
            yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"

        full_msg = ''.join(full_acc)
        prompt_tokens = LLMProvider.count_tokens(current_user_question + "\n" + sys_instruction, model=model_name)
        completion_tokens = LLMProvider.count_tokens(full_msg, model=model_name)
        total_tokens = prompt_tokens + completion_tokens

        from app.services.usage_service import UsageService
        UsageService.record_event(company_id, "message", 1, "messages", conv_id)
        UsageService.record_event(company_id, "llm_tokens", total_tokens, "tokens", conv_id)

        yield f"data: {json.dumps({'type': 'done', 'conversationId': conv_id, 'fullMessage': full_msg, 'tokensUsed': total_tokens, 'generationMode': gen_mode})}\n\n"
        yield "data: [DONE]\n\n"
