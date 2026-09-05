import re
from typing import Dict, Any
from app.schemas import ClassificationRequest, ClassificationResponse

class ClassificationService:
    @staticmethod
    def classify_text(request: ClassificationRequest) -> ClassificationResponse:
        """
        Performs intent classification, sentiment analysis, and action suggestion.
        """
        text = request.text.lower()
        
        # 1. Intent Detection
        if any(w in text for w in ["order", "tracking", "status", "shipment", "package"]):
            intent = "order_inquiry"
            suggested_action = "check_order_status"
        elif any(w in text for w in ["refund", "cancel", "money back", "return"]):
            intent = "refund_request"
            suggested_action = "execute_refund"
        elif any(w in text for w in ["book", "schedule", "appointment", "meeting", "demo"]):
            intent = "appointment_booking"
            suggested_action = "book_appointment"
        elif any(w in text for w in ["human", "agent", "person", "representative", "escalate"]):
            intent = "human_escalation"
            suggested_action = "escalate_to_human"
        elif any(w in text for w in ["price", "pricing", "plan", "cost", "quote"]):
            intent = "pricing_inquiry"
            suggested_action = "lookup_pricing"
        else:
            intent = "general_faq"
            suggested_action = None

        # 2. Sentiment & Urgency Analysis
        if any(w in text for w in ["urgent", "asap", "immediately", "broken", "emergency", "crisis"]):
            sentiment = "urgent"
            confidence = 0.95
        elif any(w in text for w in ["angry", "bad", "terrible", "worst", "unhappy", "frustrated", "scam"]):
            sentiment = "negative"
            confidence = 0.88
        elif any(w in text for w in ["thanks", "thank you", "great", "awesome", "helpful", "good", "perfect"]):
            sentiment = "positive"
            confidence = 0.92
        else:
            sentiment = "neutral"
            confidence = 0.85

        # 3. Entity Extraction (e.g. order IDs, email addresses)
        entities: Dict[str, Any] = {}
        order_match = re.search(r'\b(ord-[a-zA-Z0-9]+|txn-[0-9]+)\b', text, re.IGNORECASE)
        if order_match:
            entities["order_id"] = order_match.group(0).upper()

        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
        if email_match:
            entities["email"] = email_match.group(0)

        return ClassificationResponse(
            success=True,
            intent=intent,
            sentiment=sentiment,
            confidence=confidence,
            detected_entities=entities,
            suggested_action=suggested_action
        )
