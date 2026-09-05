# Chat-AaaS API Specification

## 1. Node.js API Gateway Endpoints (/api/v1)

### Agent Lifecycle
- GET /api/v1/agent: Fetch active company agent configuration and draft status.
- PUT /api/v1/agent/draft: Update unpublished draft configuration.
- POST /api/v1/agent/publish: Create immutable version snapshot and set active.
- POST /api/v1/agent/rollback: Restore previous agent version.

### Knowledge & Documents
- GET /api/v1/knowledge: List tenant documents and chunk counts.
- POST /api/v1/knowledge/ingest: Ingest document, URL, or FAQ.
- POST /api/v1/knowledge/crawl: Safe SSRF-protected URL crawler.

### Conversations & Inbox
- GET /api/v1/conversations: List tenant conversations with status filters.
- POST /api/v1/conversations/:id/messages: Send user message with streaming response.
- POST /api/v1/conversations/:id/takeover: Live staff human takeover.
- POST /api/v1/conversations/:id/resolve: Resolve conversation.

### Billing & Analytics
- GET /api/v1/billing: Fetch subscription tier, credit balance, and GST invoices.
- GET /api/v1/analytics/roi: Fetch automation rate, hours saved, and CSAT scores.

---

## 2. Python AI Service Endpoints (/v1)

- GET /health: Microservice health check.
- GET /ready: Component readiness check.
- POST /v1/embeddings: Batch vector embedding generation (1536-dim).
- POST /v1/rerank: Cross-encoder semantic candidate reranking.
- POST /v1/evaluate: RAG faithfulness and hallucination scoring.
- POST /v1/process-document: Document parsing, cleaning, and semantic chunking.
- POST /v1/classify: NLP intent detection, sentiment, and entity extraction.\n