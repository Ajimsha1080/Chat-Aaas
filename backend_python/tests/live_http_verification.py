import httpx
import json

BASE_URL = "http://127.0.0.1:8000"
COMPANY_ID = "comp_live_demo"
HEADERS = {
    "X-Company-ID": COMPANY_ID,
    "X-User-Role": "admin",
    "Content-Type": "application/json"
}

def run_live_test():
    client = httpx.Client(base_url=BASE_URL, timeout=15.0)

    print("\n--- 1. Testing System Health & Readiness ---")
    r_health = client.get("/health")
    print(f"Health Response ({r_health.status_code}): {r_health.json()}")

    print("\n--- 2. Ingesting Document into Knowledge Base ---")
    doc_payload = {
        "title": "CoarAI Enterprise Guide",
        "fileName": "enterprise_guide.md",
        "docType": "markdown",
        "category": "Documentation",
        "content": """
# CoarAI Enterprise Platform Documentation

## Cloud Hosting Infrastructure
CoarAI runs on AWS and Azure across 12 tier-4 data centers with 99.99% guaranteed SLA.

## Pricing Plans
| Plan | Price | Monthly Tokens | Priority Support |
| --- | --- | --- | --- |
| Starter | $29/mo | 50,000 | Email Only |
| Professional | $99/mo | 500,000 | 24/7 Dedicated |
| Enterprise | $499/mo | Unlimited | Dedicated TAM |

## Refund & Cancellation Policy
Customers are eligible for a 100% full money-back guarantee within 30 days of purchase.
        """.strip()
    }
    r_ingest = client.post("/api/v1/knowledge/files", headers=HEADERS, json=doc_payload)
    print(f"Ingest Status: {r_ingest.status_code}")
    if r_ingest.status_code == 201:
        print(f"Chunks Created: {r_ingest.json()['data']['chunksCreated']}")

    print("\n--- 3. Testing Factual Lookup ('What is the price of the Professional plan?') ---")
    chat_payload = {
        "message": "What is the price of the Professional plan?",
        "session_id": "sess_live_1",
        "history": []
    }
    r_chat1 = client.post("/api/v1/chat", headers=HEADERS, json=chat_payload)
    res1 = r_chat1.json()
    print(f"Bot Answer: {res1.get('message')}")
    print(f"Citations: {res1.get('citations')}")
    print(f"Confidence: {res1.get('confidence_score')}")

    print("\n--- 4. Testing Multi-Turn Coreference Follow-up ('How many tokens does it include?') ---")
    chat_payload2 = {
        "message": "How many tokens does it include?",
        "session_id": "sess_live_1",
        "history": [
            {"role": "user", "content": "What is the price of the Professional plan?"},
            {"role": "assistant", "content": res1.get('message', '')}
        ]
    }
    r_chat2 = client.post("/api/v1/chat", headers=HEADERS, json=chat_payload2)
    res2 = r_chat2.json()
    print(f"Bot Follow-up Answer: {res2.get('message')}")

    print("\n--- 5. Testing Comparison Query ('Compare Starter and Professional plans') ---")
    chat_payload3 = {
        "message": "Compare Starter and Professional plans",
        "session_id": "sess_live_1",
        "history": []
    }
    r_chat3 = client.post("/api/v1/chat", headers=HEADERS, json=chat_payload3)
    res3 = r_chat3.json()
    print(f"Comparison Answer:\n{res3.get('message')}")

    print("\n--- 6. Testing Out-of-Domain Refusal ('What is the recipe for pizza dough?') ---")
    chat_payload4 = {
        "message": "What is the recipe for pizza dough?",
        "session_id": "sess_live_1",
        "history": []
    }
    r_chat4 = client.post("/api/v1/chat", headers=HEADERS, json=chat_payload4)
    res4 = r_chat4.json()
    print(f"Refusal Answer: {res4.get('message')}")
    print(f"Is Refusal: {res4.get('is_refusal')}")

if __name__ == "__main__":
    run_live_test()
