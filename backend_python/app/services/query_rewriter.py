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

    @classmethod
    def rewrite_query(
        cls,
        current_question: str,
        conversation_history: Optional[List[Any]] = None
    ) -> str:
        """
        Rewrites current_question if it contains coreferential ambiguity or ellipsis referencing
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

        # Check if question contains pronouns/ambiguous references or matches elliptical pattern
        has_pronoun = any(p in q_words for p in cls.PRONOUNS_AND_REFERENCES)
        is_elliptical = any(re.search(pat, q_lower) for pat in cls.ELLIPTICAL_PATTERNS) or len(q_words) <= 3

        if not has_pronoun and not is_elliptical:
            return q_clean

        # Extract salient entities/topics from recent turns (last 4 messages)
        recent_turns = history_msgs[-4:]
        extracted_entities = []

        # Find named entities or capitalized terms in previous user queries and assistant responses
        for turn in reversed(recent_turns):
            text = turn["content"]
            # Look for capitalized words/acronyms (e.g., TARKSHA, AWS, Azure, TechFlow, CoarAI)
            caps = re.findall(r'\b[A-Z][A-Za-z0-9_-]{2,}\b', text)
            for cap in caps:
                if cap.lower() not in {"what", "when", "where", "which", "how", "this", "that", "there", "here", "hello", "thank", "thanks", "please", "yes", "sure"}:
                    if cap not in extracted_entities:
                        extracted_entities.append(cap)

            # Look for specific noun phrases after "about", "is", "for"
            about_matches = re.findall(r'(?:about|is|for|called|named)\s+([A-Za-z0-9\s_-]{2,25}?)(?:\?|\.|,|$|\n)', text, re.IGNORECASE)
            for am in about_matches:
                am_clean = am.strip()
                if am_clean and am_clean.lower() not in {"it", "that", "this", "what", "you", "me", "us", "them"}:
                    if am_clean not in extracted_entities:
                        extracted_entities.append(am_clean)

        primary_entity = extracted_entities[0] if extracted_entities else None

        if not primary_entity:
            # Look at the most recent user question
            last_user_msg = next((t["content"] for t in reversed(history_msgs) if t["role"] == "user"), None)
            if last_user_msg:
                # Remove question words and stop words
                clean_prev = re.sub(r'^(what is|who is|tell me about|explain|how does)\s+', '', last_user_msg.strip(), flags=re.IGNORECASE).rstrip('?.,')
                if len(clean_prev.split()) <= 4 and clean_prev.strip():
                    primary_entity = clean_prev.strip()

        if not primary_entity:
            return q_clean

        # Perform pronoun substitution or prefixing
        rewritten = q_clean
        # Replace 'it' / 'they' / 'that' / 'this' if appropriate
        rewritten = re.sub(r'\b(it|this|that)\b', primary_entity, rewritten, flags=re.IGNORECASE)
        rewritten = re.sub(r'\b(its|their)\b', f"{primary_entity}'s", rewritten, flags=re.IGNORECASE)
        rewritten = re.sub(r'\b(they|them)\b', primary_entity, rewritten, flags=re.IGNORECASE)

        # If question was purely elliptical like "How much?" or "What about pricing?", append entity
        if is_elliptical and primary_entity.lower() not in rewritten.lower():
            rewritten = f"{rewritten.rstrip('?')} for {primary_entity}?"

        return rewritten.strip()
