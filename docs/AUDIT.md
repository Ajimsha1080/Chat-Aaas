# CoarAI (Chat-AaaS) Ground Truth Production Audit

Generated: Phase 0 Ground Truth Baseline  
Commit Baseline: 85/85 pytest tests passing

---

## 1. Database Migrations vs `Base.metadata.create_all()`
* **Status**: Running `Base.metadata.create_all()` on boot.
* **Evidence**: `backend_python/app/db/database.py:62,66` (`Base.metadata.create_all(bind=self.engine)`).
* **Alembic Migration Files**: **NOT FOUND** (no `alembic.ini` or migration versions directory exists).
* **Database Models** (24 declarative models in `backend_python/app/db/models.py:24-490`):
  1. `Company` (`models.py:24`) — Migration: NOT FOUND
  2. `User` (`models.py:50`) — Migration: NOT FOUND
  3. `Membership` (`models.py:66`) — Migration: NOT FOUND
  4. `Agent` (`models.py:84`) — Migration: NOT FOUND
  5. `AgentVersion` (`models.py:107`) — Migration: NOT FOUND
  6. `Conversation` (`models.py:136`) — Migration: NOT FOUND
  7. `Message` (`models.py:158`) — Migration: NOT FOUND
  8. `KnowledgeCollection` (`models.py:176`) — Migration: NOT FOUND
  9. `KnowledgeSource` (`models.py:196`) — Migration: NOT FOUND
  10. `DocumentChunk` (`models.py:228`) — Migration: NOT FOUND
  11. `KnowledgeGap` (`models.py:250`) — Migration: NOT FOUND
  12. `KnowledgeFeedback` (`models.py:263`) — Migration: NOT FOUND
  13. `KnowledgeJob` (`models.py:276`) — Migration: NOT FOUND
  14. `AgentTool` (`models.py:292`) — Migration: NOT FOUND
  15. `Integration` (`models.py:315`) — Migration: NOT FOUND
  16. `Subscription` (`models.py:329`) — Migration: NOT FOUND
  17. `Invoice` (`models.py:343`) — Migration: NOT FOUND
  18. `AuditLog` (`models.py:361`) — Migration: NOT FOUND
  19. `Deployment` (`models.py:376`) — Migration: NOT FOUND
  20. `ApiKey` (`models.py:392`) — Migration: NOT FOUND
  21. `Webhook` (`models.py:409`) — Migration: NOT FOUND
  22. `ActionExecution` (`models.py:427`) — Migration: NOT FOUND
  23. `BackgroundJob` (`models.py:449`) — Migration: NOT FOUND
  24. `HandoffSession` (`models.py:474`) — Migration: NOT FOUND

---

## 2. Document Upload & Storage Path
* **Status**: In-Memory / Database Text Column only.
* **Evidence**: `backend_python/app/api/knowledge.py:284-370` (`ingest_file_document`).
* **Trace**:
  1. Frontend submits raw text in JSON `req.content`.
  2. `DocumentAIService.process_document` (`backend_python/app/services/document_ai.py:27-52`) chunks raw string into memory.
  3. Chunks are stored in `db.document_chunks` dictionary / PostgreSQL table column (`backend_python/app/api/knowledge.py:351`).
* **Object Storage (S3 / R2 / Blob Storage)**: **NOT FOUND**. Raw binary documents (.pdf, .docx) are not retained or saved to object storage.

---

## 3. Payment Gateway Integration
* **Status**: **NOT FOUND**.
* **Evidence**:
  * Razorpay integration: **NOT FOUND**
  * Stripe / PayU integration: **NOT FOUND**
  * Current implementation in `backend_python/app/services/billing_service.py:64-135` calculates simulated GST invoices and updates company tier in memory/DB without actual money movement.

---

## 4. Outbound Email / SMS Provider & Auth Verification
* **Status**: **NOT FOUND**.
* **Evidence**:
  * Provider SDKs (Resend, SES, Postmark, SendGrid, Twilio): **NOT FOUND**
  * Signup email verification: `backend_python/app/services/auth_service.py:46` hardcodes `"isEmailVerified": True`.
  * Password reset flow / endpoints: **NOT FOUND**.

---

## 5. Rate Limiting
* **Status**: Partially implemented (in-memory only).
* **Evidence**:
  * `/api/v1/chat`: **YES** (In-memory sliding window, `backend_python/app/api/chat.py:110` via `backend_python/app/services/rate_limiter.py:17-45`, max 20 req/min).
  * `/api/v1/conversations/{id}/messages`: **YES** (`backend_python/app/api/conversations.py:53`).
  * Auth endpoints (`/auth/login`, `/auth/signup`): **NOT FOUND**
  * Document upload (`/knowledge/upload`): **NOT FOUND**
  * Web Crawler (`/crawler`): **NOT FOUND**
  * Distributed Redis rate limiting: **NOT FOUND** (in-memory per-process dictionary only).

---

## 6. GitHub Actions CI Workflow
* **Status**: **NOT FOUND**.
* **Evidence**: No `.github/workflows/ci.yml` or any `.github` workflow files exist in the repository.

---

## 7. Startup Guards for Production Secrets
* **Status**: **IMPLEMENTED**.
* **Evidence**: `backend_python/app/core/config.py:12-46, 65-74`.
  * `_require_secret` enforces non-empty, min 32-char cryptographic values for `JWT_SECRET`, `PYTHON_AI_INTERNAL_SECRET`, and `ENCRYPTION_KEY` in `ENVIRONMENT=production`.
  * Rejects default placeholder secrets (`super-secret-jwt-key...`, `secret-internal-key...`, `0123456789...`) and raises `RuntimeError` on boot.

---

## 8. Usage Counting & Quota Enforcement
* **Status**: Implemented for Conversation Count & Document Count.
* **Evidence**:
  * Telemetry recording: `backend_python/app/services/usage_service.py:7-24` (`UsageService.record_event`).
  * Monthly Conversation Quota: Hard stop (HTTP 402) in `backend_python/app/api/chat.py:101-106`.
  * Document Upload Quota: Hard stop (HTTP 402) in `backend_python/app/api/knowledge.py:266-282`.
  * Token/Cost Dollar Cap: **NOT FOUND** (only unit counts are capped).

---

## 9. LLM Calls Per Turn & Cost Ceiling
* **Status**: 1 LLM call per grounded turn, 0 for heuristic/tool routes; Cost ceiling is NOT FOUND.
* **Evidence**:
  * Grounded answer turn: 1 call to `LLMProvider.generate_response` (`backend_python/app/services/agent_runtime.py:201-206`).
  * Greetings, gratitudes, identity queries, tool executions, and ungrounded refusals: 0 LLM calls (`agent_runtime.py:59, 75, 151, 159, 182`).
  * Per-tenant monthly token/cost ceiling in INR/USD: **NOT FOUND**.

---

## 10. Structured Logging, Error Tracking & Metrics
* **Status**: **NOT FOUND**.
* **Evidence**:
  * Structured JSON logger with `request_id` and `tenant_id`: **NOT FOUND** (basic stdout logger only).
  * Error Tracker (Sentry): **NOT FOUND**.
  * Prometheus `/metrics` endpoint: **NOT FOUND**.
  * Timing header: `x-response-time-ms` added in `backend_python/app/main.py:87`.

---

## 11. Frontend Test Coverage
* **Status**: **0 Tests / NOT FOUND**.
* **Evidence**:
  * Unit tests (Jest / Vitest) in `package.json`: **NOT FOUND** (`package.json:10-12` test script points exclusively to pytest).
  * E2E tests (Playwright / Cypress): **NOT FOUND**.

---

## 12. Secret Exposure Analysis
* **Status**: 1 Critical Finding.
* **Evidence**:
  * `backend_python/app/api/companies.py:31-40`: `list_companies()` has **NO authentication dependency** (`Depends(get_tenant_context)` missing) and returns all companies including `"apiKey"` and `"apiSecretEncrypted"`.
  * `public/widget.js`: Safe (only consumes `data-agent-key` client attribute, no server secrets serialized).
  * `backend_python/app/api/integrations.py:24-34`: Credentials are masked before response.
