import asyncio
import json
import httpx
from typing import AsyncGenerator, Dict, Any, List, Optional
from app.core.config import settings

class LLMProvider:
    """
    Multi-Provider & Custom In-House Model API Service.
    Supports:
    - Custom In-House Product API (via CUSTOM_LLM_API_URL)
    - Self-Hosted Ollama / vLLM / LocalAI
    - Built-in grounded RAG simulation fallback
    """

    @classmethod
    async def generate_response(
        cls,
        prompt: str,
        system_instruction: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1000
    ) -> str:
        target_model = model or settings.DEFAULT_LLM_MODEL
        custom_url = settings.CUSTOM_LLM_API_URL

        # 1. Dispatch to Custom In-House Product API if configured with API key
        if custom_url and settings.CUSTOM_LLM_API_KEY:
            try:
                headers = {"Content-Type": "application/json"}
                if settings.CUSTOM_LLM_API_KEY:
                    headers["Authorization"] = f"Bearer {settings.CUSTOM_LLM_API_KEY}"
                    headers["api-subscription-key"] = settings.CUSTOM_LLM_API_KEY

                payload = {
                    "model": target_model,
                    "messages": [
                        *([{"role": "system", "content": system_instruction}] if system_instruction else []),
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": temperature,
                    "max_tokens": max_tokens
                }

                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(custom_url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        # Extract response from standard choices or custom response key
                        if "choices" in data and len(data["choices"]) > 0:
                            return data["choices"][0].get("message", {}).get("content", str(data))
                        elif "response" in data:
                            return str(data["response"])
                        elif "message" in data:
                            return str(data["message"])
            except Exception as e:
                # Log error and fallback gracefully to deterministic generation
                print(f"[Custom LLM API Error] {e}")

        # 2. Local Grounded Extraction (when external API is not configured or offline)
        if system_instruction and "Verified Knowledge Context:" in system_instruction:
            return cls.synthesize_grounded_answer(prompt, system_instruction)

        return f"Regarding your inquiry about '{prompt}', our team is available to assist."

    @classmethod
    def synthesize_grounded_answer(cls, prompt: str, system_instruction: str) -> str:
        """
        Synthesizes a structured, highly informative grounded answer from verified company context
        without cutting off after arbitrary line counts.
        """
        import re

        if not system_instruction or "Verified Knowledge Context:" not in system_instruction:
            return f"Regarding your inquiry about '{prompt}', our team is available to assist."

        context_body = system_instruction.split("Verified Knowledge Context:")[1].strip()
        raw_sources = context_body.split("Source (")
        extracted_sections = []

        stop_words = {
            "what", "is", "the", "a", "an", "in", "on", "at", "for", "to", "of", "and", "or",
            "are", "how", "do", "does", "can", "tell", "me", "about", "our", "your", "this", "explain", "policy"
        }
        all_query_words = set(re.findall(r'\w+', prompt.lower()))
        prompt_words = [w for w in all_query_words if w not in stop_words] or list(all_query_words)

        seen_content = set()

        for raw in raw_sources:
            if not raw.strip():
                continue
            title = "Verified Documentation"
            body = raw
            if "): " in raw:
                parts = raw.split("): ", 1)
                title = parts[0].strip()
                body = parts[1]

            cleaned_paragraphs = []
            current_block = []

            for line in body.split("\n"):
                sline = line.strip()
                if not sline:
                    continue
                # Strip raw markdown page markers or standalone numbers
                if re.match(r'^##\s*Page\s*\d+', sline, re.I):
                    continue
                if re.match(r'^\d{1,3}$', sline):
                    continue
                if "• INTERNAL OPERATIONS" in sline or "• INTERNAL SOP" in sline or "INTERNAL COMPANY OPERATIONS" in sline and len(sline) < 40:
                    continue
                if sline in seen_content:
                    continue
                seen_content.add(sline)

                # Format section headers
                if sline.isupper() and len(sline) < 40 and not sline.startswith("HTTP"):
                    if current_block:
                        cleaned_paragraphs.append(" ".join(current_block))
                        current_block = []
                    cleaned_paragraphs.append(f"**{sline.title()}**:")
                elif sline.startswith("□") or sline.startswith("•") or sline.startswith("-") or re.match(r'^\d{2}\s+', sline):
                    if current_block:
                        cleaned_paragraphs.append(" ".join(current_block))
                        current_block = []
                    item = re.sub(r'^[□•\-\d\.\s]+', '', sline).strip()
                    if item:
                        cleaned_paragraphs.append(f"- {item}")
                else:
                    current_block.append(sline)

            if current_block:
                cleaned_paragraphs.append(" ".join(current_block))

            if cleaned_paragraphs:
                extracted_sections.append({
                    "title": title,
                    "text": "\n\n".join(cleaned_paragraphs)
                })

        if not extracted_sections:
            return f"Regarding your inquiry about '{prompt}', our team is available to assist."

        # Rank sections by keyword overlap with user prompt
        for sec in extracted_sections:
            sec_words = set(re.findall(r'\w+', sec["text"].lower()))
            sec["score"] = sum(1 for w in prompt_words if w in sec_words)

        extracted_sections.sort(key=lambda s: s.get("score", 0), reverse=True)

        combined_body = "\n\n".join([f"### {sec['title']}\n{sec['text']}" for sec in extracted_sections[:2]])
        return f"Based on verified documentation:\n\n{combined_body}"

    @classmethod
    async def stream_chat_completion(
        cls,
        messages: List[Dict[str, str]],
        system_instruction: str,
        model: Optional[str] = None,
        temperature: float = 0.3
    ) -> AsyncGenerator[str, None]:
        """
        Asynchronously streams LLM token events for low TTFT (Time-To-First-Token).
        """
        target_model = model or settings.DEFAULT_LLM_MODEL
        custom_url = settings.CUSTOM_LLM_API_URL

        if custom_url:
            try:
                headers = {"Content-Type": "application/json"}
                if settings.CUSTOM_LLM_API_KEY:
                    headers["Authorization"] = f"Bearer {settings.CUSTOM_LLM_API_KEY}"
                    headers["api-subscription-key"] = settings.CUSTOM_LLM_API_KEY

                payload = {
                    "model": target_model,
                    "messages": [
                        {"role": "system", "content": system_instruction},
                        *messages
                    ],
                    "temperature": temperature,
                    "stream": True
                }

                async with httpx.AsyncClient(timeout=30.0) as client:
                    async with client.stream("POST", custom_url, headers=headers, json=payload) as response:
                        async for chunk in response.aiter_text():
                            if chunk:
                                yield chunk
                        return
            except Exception as e:
                print(f"[Custom LLM Stream Error] {e}")

        # Fallback local stream with grounded synthesis
        last_message = messages[-1]["content"] if messages else "Hello"
        synthesized_text = cls.synthesize_grounded_answer(last_message, system_instruction)
        words = synthesized_text.split(" ")

        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")
            await asyncio.sleep(0.015)
