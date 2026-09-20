import re
from typing import List, Optional, Dict, Any
from app.schemas import ChatMessage

class QueryRewriter:
    """
    Intelligent Context-Aware Query Rewriter for RAG follow-up reference resolution.
    Resolves anaphoric pronouns ('it', 'they', 'that', 'this', 'their') and conversational context
    so that retrieval vector embeddings and keyword matching find the exact relevant knowledge chunks.
    """

    PRONOUNS_AND_REFERENCES = {
        "it", "its", "itself", "they", "them", "their", "theirs", "themselves",
        "this", "that", "these", "those", "such", "there", "here", "the system",
        "the company", "the tool", "the platform", "the agent", "the software",
        "the service", "the product", "the feature"
    }

    ELLIPTICAL_PATTERNS = [
        r'^(how|what|why|where|when|who)\s+(about|with|for)\s+',
        r'^(how much|how many|how long|how often|how so)\??$',
        r'^(tell me more|more details|explain more|elaborate)\??$',
        r'^(is it|can it|does it|will it|are they|do they|can they)\b',
        r'^(what about|and for|how about)\b',
    ]

    ORDINAL_MAP = {
        "first": 0, "1st": 0, "the first one": 0, "the first": 0,
        "second": 1, "2nd": 1, "the second one": 1, "the second": 1,
        "third": 2, "3rd": 2, "the third one": 2, "the third": 2,
        "fourth": 3, "4th": 3, "the fourth one": 3, "the fourth": 3,
        "last": -1, "the last one": -1, "the latter": -1, "the former": 0
    }

    @classmethod
    def rewrite_query(
        cls,
        current_question: str,
        conversation_history: Optional[List[Any]] = None
    ) -> str:
        """
        Rewrites current_question if it contains coreferential ambiguity, ordinals, or ellipsis referencing
        prior conversational turns.
        """
        if not current_question or not current_question.strip():
            return ""

        q_clean = current_question.strip()
        if not conversation_history:
            return q_clean

        # Normalize history items to list of dicts with role and content
        history_msgs = []
        for m in conversation_history:
            if isinstance(m, dict):
                role = m.get("role") or m.get("sender") or "user"
                content = m.get("content") or m.get("text") or ""
            elif hasattr(m, "role") and hasattr(m, "content"):
                role = m.role
                content = m.content
            elif hasattr(m, "sender") and hasattr(m, "text"):
                role = "user" if m.sender == "user" else "assistant"
                content = m.text
            else:
                continue
            if content:
                history_msgs.append({"role": role, "content": content})

        if not history_msgs:
            return q_clean

        q_lower = q_clean.lower()
        q_words = re.findall(r'\b[a-zA-Z0-9_-]+\b', q_lower)

        # Check if question has an ordinal reference
        has_ordinal = any(k in q_lower for k in cls.ORDINAL_MAP)
        has_pronoun = any(p in q_words for p in cls.PRONOUNS_AND_REFERENCES)
        is_elliptical = any(re.search(pat, q_lower) for pat in cls.ELLIPTICAL_PATTERNS) or len(q_words) <= 3

        if not has_pronoun and not is_elliptical and not has_ordinal:
            return q_clean

        # Extract salient entities/topics and list items from recent turns (last 4 messages)
        recent_turns = history_msgs[-4:]
        extracted_entities = []
        extracted_list_items = []

        for turn in reversed(recent_turns):
            text = turn["content"]
            # Extract bullet/numbered list items using MULTILINE
            list_matches = re.findall(r'^[ \t]*(?:[-*•□]|\d+[.)])\s+\**([A-Za-z0-9\s_\-]{2,40}?)\**(?:\:|\.|\n|$)', text, flags=re.MULTILINE)
            for lm in list_matches:
                clean_lm = lm.strip()
                if clean_lm and clean_lm.lower() not in {"note", "warning", "features", "details"}:
                    if clean_lm not in extracted_list_items:
                        extracted_list_items.append(clean_lm)

            # Look for specific noun phrases after "about", "is", "for", "called", "named"
            about_matches = re.findall(r'(?:about|is|for|called|named)\s+([A-Za-z0-9\s_-]{2,35}?)(?:\?|\.|,|$|\n)', text, re.IGNORECASE)
            for am in about_matches:
                clean_am = re.sub(r'^(the|a|an|our|your)\s+', '', am.strip(), flags=re.IGNORECASE).strip()
                if clean_am and clean_am.lower() not in {"it", "that", "this", "what", "you", "me", "us", "them"}:
                    if clean_am not in extracted_entities:
                        extracted_entities.append(clean_am)

            # Look for multi-word Capitalized phrases first (e.g. Enterprise Cloud, Enterprise AI Gateway, Starter Plan)
            multi_caps = re.findall(r'\b[A-Z][A-Za-z0-9_-]*(?:\s+[A-Z][A-Za-z0-9_-]*)+\b', text)
            for mc in multi_caps:
                if mc.lower() not in {"what is", "who is", "tell me", "thank you", "hello there"}:
                    if mc not in extracted_entities:
                        extracted_entities.append(mc)

            # Fallback to single capitalized words/acronyms (e.g., TARKSHA, AWS, Azure, TechFlow, CoarAI)
            caps = re.findall(r'\b[A-Z][A-Za-z0-9_-]{2,}\b', text)
            for cap in caps:
                if cap.lower() not in {"what", "when", "where", "which", "how", "this", "that", "there", "here", "hello", "thank", "thanks", "please", "yes", "sure", "the", "for", "with", "plan"}:
                    if cap not in extracted_entities:
                        extracted_entities.append(cap)

        # Sort ORDINAL_MAP by key length descending so longer phrases match first
        if has_ordinal and extracted_list_items:
            for ord_key in sorted(cls.ORDINAL_MAP.keys(), key=len, reverse=True):
                ord_idx = cls.ORDINAL_MAP[ord_key]
                if ord_key in q_lower:
                    if 0 <= ord_idx < len(extracted_list_items) or (ord_idx == -1 and extracted_list_items):
                        target_item = extracted_list_items[ord_idx]
                        rewritten = re.sub(rf'\b{re.escape(ord_key)}\b', target_item, q_clean, flags=re.IGNORECASE)
                        if target_item.lower() not in rewritten.lower():
                            rewritten = f"{rewritten.rstrip('?')} regarding {target_item}?"
                        return rewritten.strip()

        primary_entity = extracted_entities[0] if extracted_entities else (extracted_list_items[0] if extracted_list_items else None)

        if not primary_entity:
            # Look at the most recent user question
            last_user_msg = next((t["content"] for t in reversed(history_msgs) if t["role"] == "user"), None)
            if last_user_msg:
                clean_prev = re.sub(r'^(what is|who is|tell me about|explain|how does)\s+', '', last_user_msg.strip(), flags=re.IGNORECASE).rstrip('?.,')
                if len(clean_prev.split()) <= 4 and clean_prev.strip():
                    primary_entity = clean_prev.strip()

        if not primary_entity:
            return q_clean

        # Perform pronoun substitution or prefixing
        rewritten = q_clean
        rewritten = re.sub(r'\b(it|this|that)\b', primary_entity, rewritten, flags=re.IGNORECASE)
        rewritten = re.sub(r'\b(its|their)\b', f"{primary_entity}'s", rewritten, flags=re.IGNORECASE)
        rewritten = re.sub(r'\b(they|them)\b', primary_entity, rewritten, flags=re.IGNORECASE)

        # If question was purely elliptical like "How much?", "What about pricing?", append entity
        if is_elliptical and primary_entity.lower() not in rewritten.lower():
            rewritten = f"{rewritten.rstrip('?')} for {primary_entity}?"

        return rewritten.strip()
