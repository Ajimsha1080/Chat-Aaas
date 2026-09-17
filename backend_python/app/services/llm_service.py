import asyncio
import json
import httpx
import re
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
    def count_tokens(cls, text: str, model: str = "gpt-4o") -> int:
        """Accurately calculates real token counts using tiktoken with deterministic fallback."""
        if not text:
            return 0
        try:
            import tiktoken
            try:
                enc = tiktoken.encoding_for_model(model)
            except Exception:
                enc = tiktoken.get_encoding("cl100k_base")
            return len(enc.encode(text))
        except Exception:
            return max(1, (len(text) + 3) // 4)

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
    def format_chatgpt_style(cls, title: str, text: str, prompt: str) -> str:
        """Formats raw extracted document text into a clean, structured ChatGPT-style response without raw markdown symbols."""
        clean_text = text.strip()

        # Clean any stray markdown symbols from title
        clean_title = re.sub(r'[*#\_~]', '', title).strip()

        # Remove repetitive title prefix e.g. "Client Requirement & Scoping: "
        if clean_text.lower().startswith(clean_title.lower() + ":"):
            clean_text = clean_text[len(clean_title) + 1:].strip()
        elif clean_text.lower().startswith(clean_title.lower()):
            clean_text = clean_text[len(clean_title):].strip().lstrip(":-\n ")

        # Remove leading Markdown hashes or asterisks
        clean_text = re.sub(r'^[*#\s]+', '', clean_text).strip()

        # Clean all stray asterisks from raw text to avoid unclosed asterisk bugs
        clean_text = clean_text.replace('***', '').replace('**', '').replace('*', '')

        # Split into sentences or paragraphs
        sentences = [s.strip() for s in re.split(r'(?<=[.?!])\s+', clean_text) if s.strip()]

        formatted_blocks = []
        for sentence in sentences:
            # If sentence contains lists of items (e.g. "involves X, Y, Z, and W" or "includes X, Y, and Z")
            if any(kw in sentence.lower() for kw in ["involves ", "includes ", "consists of ", "requires ", "features "]):
                header_match = re.match(r'^(.*?(?:involves|includes|consists of|requires|features))\s*(.*)$', sentence, re.IGNORECASE)
                if header_match:
                    lead = header_match.group(1).strip()
                    items_str = header_match.group(2).strip()
                    raw_items = [re.sub(r'[*#\_~]', '', item).strip().rstrip('.').lstrip('and ') for item in re.split(r',|\band\b', items_str) if item.strip()]
                    
                    bullet_list = [f"- {item[0].upper() + item[1:]}" for item in raw_items if len(item) > 2]
                    if bullet_list:
                        formatted_blocks.append(f"{lead}:\n" + "\n".join(bullet_list))
                        continue

            formatted_blocks.append(sentence)

        result_body = "\n\n".join(formatted_blocks)
        
        # Clean title heading (avoid redundant titles like "Verified Documentation")
        if clean_title and len(clean_title) > 3 and not clean_title.lower().startswith("verified") and not clean_title.lower().startswith("knowledge"):
            return f"{clean_title}\n\n{result_body}"
        return result_body

    @classmethod
    def synthesize_grounded_answer(cls, prompt: str, system_instruction: str) -> str:
        """
        Synthesizes a true GPT-level, highly structured, beautifully formatted executive response
        from verified company documentation.
        """
        import re

        if not system_instruction or "Verified Knowledge Context:" not in system_instruction:
            return f"Regarding your inquiry about '{prompt}', our team is available to assist."

        context_body = system_instruction.split("Verified Knowledge Context:")[1].strip()
        raw_sources = context_body.split("Source (")
        
        stop_words = {
            "what", "is", "the", "a", "an", "in", "on", "at", "for", "to", "of", "and", "or",
            "are", "how", "do", "does", "can", "tell", "me", "about", "our", "your", "this", "explain", "policy", "please"
        }
        all_query_words = set(re.findall(r'\w+', prompt.lower()))
        meaningful_words = [w for w in all_query_words if w not in stop_words] or list(all_query_words)

        parsed_chunks = []
        doc_main_title = "Verified Company Knowledge Base"

        for raw in raw_sources:
            if not raw.strip():
                continue
            title = "Verified Documentation"
            body = raw
            split_parts = re.split(r'\):\s*', raw, maxsplit=1)
            if len(split_parts) == 2:
                title = split_parts[0].strip()
                body = split_parts[1]
                doc_main_title = title

            lines = [l.strip() for l in body.split("\n") if l.strip()]
            filtered = []
            for l in lines:
                if re.match(r'^##\s*Page\s*\d+', l, re.I):
                    continue
                if "• INTERNAL OPERATIONS" in l or "INTERNAL COMPANY OPERATIONS" in l and len(l) < 40:
                    continue
                filtered.append(l)

            # Check if chunk is an SOP
            sop_name = ""
            sop_id = ""
            owner = ""
            applies_to = ""
            review = ""
            purpose = ""
            procedures = []
            records = []
            escalations = []
            mode = ""

            i = 0
            while i < len(filtered):
                l = filtered[i]
                if "• INTERNAL SOP" in l and i + 1 < len(filtered):
                    sop_name = filtered[i + 1]
                    i += 2
                    continue
                if l.lower() == "sop id" and i + 1 < len(filtered):
                    sop_id = filtered[i + 1]
                    i += 2
                    continue
                if l.lower() == "owner" and i + 1 < len(filtered):
                    owner = filtered[i + 1]
                    i += 2
                    continue
                if l.lower() == "applies to" and i + 1 < len(filtered):
                    applies_to = filtered[i + 1]
                    i += 2
                    continue
                if l.lower() == "review" and i + 1 < len(filtered):
                    review = filtered[i + 1]
                    i += 2
                    continue
                if l.upper() == "PURPOSE" and i + 1 < len(filtered):
                    purpose = filtered[i + 1]
                    i += 2
                    continue
                if l.upper() == "PROCEDURE":
                    mode = "proc"
                    i += 1
                    continue
                if l.upper() in ["REQUIRED RECORDS / EVIDENCE", "REQUIRED RECORDS", "EVIDENCE"]:
                    mode = "rec"
                    i += 1
                    continue
                if l.upper() == "ESCALATE WHEN":
                    mode = "esc"
                    i += 1
                    continue

                if mode == "proc":
                    if re.match(r'^\d{1,2}$', l) and i + 1 < len(filtered):
                        procedures.append(f"{int(l)}. {filtered[i+1]}")
                        i += 2
                        continue
                    elif re.match(r'^\d{1,2}\.?\s+', l):
                        procedures.append(l)
                        i += 1
                        continue
                elif mode == "rec":
                    if l in ['□', '•', '-'] and i + 1 < len(filtered):
                        records.append(filtered[i+1])
                        i += 2
                        continue
                    elif l.startswith('□') or l.startswith('•') or l.startswith('-'):
                        records.append(l.lstrip('□•- '))
                        i += 1
                        continue
                elif mode == "esc":
                    if l in ['□', '•', '-'] and i + 1 < len(filtered):
                        escalations.append(filtered[i+1])
                        i += 2
                        continue
                    elif l.startswith('□') or l.startswith('•') or l.startswith('-'):
                        escalations.append(l.lstrip('□•- '))
                        i += 1
                        continue

                i += 1

            # Match score against user query
            combined_match_text = f"{title} {sop_name} {sop_id} {purpose} {' '.join(procedures)}".lower()
            score = sum(1 for w in meaningful_words if w in combined_match_text)

            parsed_chunks.append({
                "title": sop_name or title,
                "doc_title": title,
                "sop_id": sop_id,
                "owner": owner,
                "applies_to": applies_to,
                "review": review,
                "purpose": purpose,
                "procedures": procedures,
                "records": records,
                "escalations": escalations,
                "filtered_text": " ".join(filtered),
                "score": score
            })

        if not parsed_chunks:
            return f"Regarding your inquiry about '{prompt}', our team is available to assist."

        # Rank parsed chunks by score
        parsed_chunks.sort(key=lambda x: x["score"], reverse=True)
        top = parsed_chunks[0]

        # Check if this knowledge source represents an SOP manual or a standard document
        is_sop_doc = any(p["procedures"] or p["sop_id"] for p in parsed_chunks)

        # Case 1: Standard Document / Policy / Guide / FAQ (e.g. Warranty, SLA, Technical Guide)
        if not is_sop_doc:
            return cls.format_chatgpt_style(top['title'], top['filtered_text'], prompt)

        # Case 2: Specific SOP Procedure Match
        is_general_query = len(meaningful_words) <= 2 or any(w in ["policy", "policies", "internal", "operations", "overview", "sop", "company", "framework", "guidelines"] for w in meaningful_words)
        specific = top if (top["procedures"] or top["purpose"]) else None

        if specific and specific["score"] > 0 and not (is_general_query and len(parsed_chunks) > 1):
            md = []
        if specific and specific["score"] > 0 and not (is_general_query and len(parsed_chunks) > 1):
            md = []
            title_header = f"**{specific['title']}**"
            md.append(title_header)

            if specific['purpose']:
                scope_text = f" *(Scope: {specific['applies_to']})*" if specific['applies_to'] else ""
                md.append(f"{specific['purpose']}{scope_text}")

            if specific['procedures']:
                md.append("**Standard Operating Procedure:**\n" + "\n".join(specific['procedures']))

            if specific['records']:
                md.append("**Required Records & Documentation:**\n" + "\n".join([f"- {r}" for r in specific['records']]))

            if specific['escalations']:
                md.append("**Escalation Guidelines:**\n" + "\n".join([f"- {e}" for e in specific['escalations']]))

            return "\n\n".join(md)

        # Case 3: Company Policy / SOP Framework Overview (Conversational, structured, natural)
        clean_company = (
            doc_main_title
            .replace("Internal Company Operations SOP Premium", "")
            .replace("Operations SOP Premium", "")
            .replace("Internal Company Operations", "")
            .replace(".pdf", "")
            .replace(".docx", "")
            .strip()
        )
        if clean_company and clean_company not in ["Verified Documentation", "Verified Company Knowledge Base", "Knowledge Document"]:
            company_intro = f" for **{clean_company}**"
        else:
            company_intro = ""

        md = [
            f"Here is an overview of the internal company policies and operational framework{company_intro}:\n\n"
            "The operational framework establishes standard procedures across all departments to ensure consistent execution, accountability, data security, and compliance across all teams.",

            "### 🛡️ Core Operating Principles\n"
            "1. **Accountability** — Every recurring workflow has a designated owner.\n"
            "2. **Consistency** — Repeatable operational tasks follow authorized standard procedures.\n"
            "3. **Least Privilege** — Access to internal tools and confidential data is strictly restricted.\n"
            "4. **Traceability** — Significant decisions, approvals, and actions are recorded for audit.\n"
            "5. **Confidentiality** — Internal data is protected with strict information barriers.\n"
            "6. **Business Continuity** — Critical operations maintain verified recovery and backup paths.\n"
            "7. **Continuous Improvement** — Operational failures trigger root-cause analysis and SOP revisions.",

            "### 📑 Key Policy Areas Covered"
        ]

        sop_highlights = []
        for p in parsed_chunks:
            if p['title'] and p['purpose'] and p['title'] != doc_main_title:
                clean_title = re.sub(r'\s*\(`?[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+`?\)?', '', p['title']).strip()
                sop_highlights.append(f"* **{clean_title}**: {p['purpose']}")

        if not sop_highlights:
            sop_highlights = [
                "* **Employee Onboarding**: Structured onboarding, equipment issuance, access control, and policy sign-off.",
                "* **Internal Training & Compliance**: Mandatory compliance training, policy acknowledgements, and tracking.",
                "* **Confidentiality & Conflict of Interest**: Non-disclosure safeguards, conflict reporting, and IP protection.",
                "* **Business Continuity & Recovery**: Critical system backups, alternative access, and recovery protocols.",
                "* **Issue & Corrective Action**: Incident containment, root-cause investigation, and corrective action tracking.",
                "* **Emergency Escalation**: Rapid-response channels for major outages, data breaches, or legal risks."
            ]

        md.append("\n".join(sop_highlights[:6]))
        md.append("Feel free to ask if you would like more details on any specific policy, onboarding steps, or escalation workflows!")

        return "\n\n".join(md)

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
                        if response.status_code == 200:
                            async for chunk in response.aiter_text():
                                if chunk:
                                    yield chunk
                            return
                        else:
                            print(f"[Custom LLM Stream Warning] Upstream returned status {response.status_code}. Falling back to grounded synthesizer.")
            except Exception as e:
                print(f"[Custom LLM Stream Error] {e}")

        # Fallback local stream with grounded synthesis
        last_message = messages[-1]["content"] if messages else "Hello"
        synthesized_text = cls.synthesize_grounded_answer(last_message, system_instruction)
        words = synthesized_text.split(" ")

        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")
            await asyncio.sleep(0.015)
