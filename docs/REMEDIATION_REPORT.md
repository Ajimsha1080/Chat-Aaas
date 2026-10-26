# CoarAI Enterprise SaaS Remediation & Fix Report

**Report Date:** October 26, 2026  
**Scope:** Remediation of Security Blockers, Data Layer Architecture, Billing Enforcement, Operations, and Code Cleanup  
**Branch:** `main` | **Target Repository:** `https://github.com/Ajimsha1080/Chat-Aaas`  

---

## 1. Executive Summary of Remediations

This document details all code remediations implemented across the CoarAI platform to resolve critical security vulnerabilities, eliminate mock/demo fallbacks, harden the PostgreSQL data layer, enforce cryptographic billing verification, and establish operational observability.

---

## 2. Itemized Remediations (P0 - P3)

### P0 — Critical Security & Multi-Tenancy Remediations

#### 1. Elimination of Unauthenticated Tenant Fallbacks
- **Files Modified:** [`backend_python/app/core/tenant.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/backend_python/app/core/tenant.py), [`backend_python/app/core/security.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/backend_python/app/core/security.py)
- **Root Cause:** If no `Authorization` header or valid JWT was supplied, the tenant extractor fell back to `"comp-coarai"` and granted default roles.
- **Remediation:** Removed all unauthenticated tenant fallbacks. Route requests lacking valid signed Bearer JWTs immediately abort with `HTTP 401 Unauthorized`.
- **Regression Test:** `backend_python/tests/test_route_authentication.py::test_unauthenticated_routes_return_401` & `test_spoofed_company_header_returns_401`.

#### 2. Route-Level RBAC Enforcement on Company Creation
- **Files Modified:** [`backend_python/app/api/companies.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/backend_python/app/api/companies.py)
- **Root Cause:** `POST /companies` lacked strict permission dependencies, allowing unauthorized provisioning.
- **Remediation:** Added `Security(has_permission("company:create"))` dependency to `POST /companies`.
- **Regression Test:** `backend_python/tests/test_route_authentication.py::test_post_companies_requires_authentication_and_permission`.

#### 3. Short-Lived JWT Expiration & Constant-Time API Key Hashing
- **Files Modified:** [`backend_python/app/core/config.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/backend_python/app/core/config.py), [`backend_python/app/core/security.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/backend_python/app/core/security.py)
- **Root Cause:** Default tokens had long TTLs, and API keys were stored unhashed or checked using standard string comparison susceptible to timing attacks.
- **Remediation:** Configured `ACCESS_TOKEN_EXPIRE_MINUTES = 15`. Stored API keys as SHA-256 hashes at rest and verified them using `hmac.compare_digest`.
- **Regression Test:** `backend_python/tests/test_route_authentication.py::test_access_token_expiry_matches_15_minutes` & `test_api_keys_hashed_at_rest_and_verified_in_constant_time`.

#### 4. PostgreSQL Row-Level Security (RLS) Kernel Enforcement
- **Files Modified:** [`backend_python/app/db/session.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/backend_python/app/db/session.py), [`backend_python/alembic/versions/0002_enable_postgresql_rls.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/backend_python/alembic/versions/0002_enable_postgresql_rls.py)
- **Root Cause:** Multi-tenancy was previously enforced solely at the application query level without kernel-level database isolation guarantees.
- **Remediation:** Enabled RLS on core tables (`companies`, `users`, `agents`, `knowledge_sources`, `conversations`, `api_keys`). Every database session executes `SET LOCAL app.current_tenant_id` and `SET LOCAL app.is_super_admin = 'false'`.
- **Regression Test:** `backend_python/tests/test_tenant_isolation.py::test_postgresql_rls_session_isolation`.

---

### P1 — Core Product Correctness & Data Layer Remediations

#### 5. Razorpay HMAC-SHA256 Webhook Verification & Idempotency
- **Files Modified:** [`backend_python/app/services/payment_service.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/backend_python/app/services/payment_service.py)
- **Root Cause:** Webhook handlers lacked cryptographic signature validation and replay deduplication.
- **Remediation:** Enforced HMAC-SHA256 signature verification with `hmac.compare_digest`. Added Redis key deduplication for webhook event IDs. Handled subscription activation, payment charge, halt (past-due), and cancellation.
- **Regression Test:** `backend_python/tests/test_tenant_isolation.py::test_razorpay_webhook_signature_and_idempotency`.

#### 6. Transactional Email Delivery with Expiring Single-Use Cryptographic Tokens
- **Files Modified:** [`backend_python/app/services/email_service.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/backend_python/app/services/email_service.py)
- **Root Cause:** Email verification used static unexpiring tokens with mock console delivery.
- **Remediation:** Implemented transactional delivery via Resend / AWS SES with cryptographically secure, expiring single-use tokens. Failed attempts or replayed tokens are rejected.
- **Regression Test:** `backend_python/tests/test_tenant_isolation.py::test_email_single_use_expiring_tokens`.

#### 7. Per-Tenant Monthly Token & Cost Cap Enforcement
- **Files Modified:** [`backend_python/app/services/usage_service.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/backend_python/app/services/usage_service.py), [`backend_python/app/api/v1/chat.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/backend_python/app/api/v1/chat.py)
- **Root Cause:** Tenants could burn unlimited tokens without regard to their active subscription tier.
- **Remediation:** Metered usage against monthly tier limits (Starter: 2M tokens/₹1,500; Growth: 15M tokens/₹7,500; Enterprise: 100M tokens/₹35,000). Requests breaching caps return `HTTP 402 Payment Required`.
- **Regression Test:** `backend_python/tests/test_tenant_isolation.py::test_monthly_token_and_cost_cap_enforcement`.

#### 8. Frontend Auth Persistence & Token Bootstrap
- **Files Modified:** [`src/api/apiClient.ts`](file:///c:/Users/91730/Downloads/Chat%20Aaas/src/api/apiClient.ts), [`src/context/AppContext.tsx`](file:///c:/Users/91730/Downloads/Chat%20Aaas/src/context/AppContext.tsx), [`src/services/aiEngine.ts`](file:///c:/Users/91730/Downloads/Chat%20Aaas/src/services/aiEngine.ts)
- **Root Cause:** Calling `APIClient.setAuth(null, companyId)` during knowledge ingestion and chat wiped the active bearer token from memory.
- **Remediation:** Replaced with `APIClient.setCompanyId(companyId)` and implemented `APIClient.ensureAuthenticatedSession()`, persisting `coarai_access_token` in `localStorage`.
- **Regression Test:** Live UI Ingestion (201) & Chat RAG (200) verified through `http://localhost:5173`.

---

### P2 — Reliability & Infrastructure Remediations

#### 9. Production Docker Compose Hardening
- **Files Modified:** [`docker-compose.yml`](file:///c:/Users/91730/Downloads/Chat%20Aaas/docker-compose.yml), [`.env.example`](file:///c:/Users/91730/Downloads/Chat%20Aaas/.env.example)
- **Root Cause:** Fallback passwords and mock secrets were present in docker configuration.
- **Remediation:** Enforced required environment variable validation via `${VAR:?VAR is required}`. Added fail-fast checks in production startup against mock secrets or localhost URLs.
- **Verification:** `docker-compose config` executes cleanly with valid environment variables.

#### 10. Sliding-Window Distributed Rate Limiting
- **Files Modified:** [`backend_python/app/services/rate_limiter.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/backend_python/app/services/rate_limiter.py)
- **Root Cause:** Rate limiter allowed localhost bypass and used in-memory dictionary when Redis was unavailable.
- **Remediation:** Enforced Redis sliding-window algorithm and disabled in-memory fallback in production.
- **Regression Test:** `scripts/pentest.py` Attack 10 verified.

---

### P3 — Cleanup & Operational Deliverables

#### 11. Elimination of Dead Variables & Redundant Code
- **Files Modified:** [`backend_python/app/db/database.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/backend_python/app/db/database.py), [`backend_python/app/main.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/backend_python/app/main.py), [`backend_python/app/services/llm_service.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/backend_python/app/services/llm_service.py), [`backend_python/app/services/tool_registry.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/backend_python/app/services/tool_registry.py), [`src/components/dashboard/DeployView.tsx`](file:///c:/Users/91730/Downloads/Chat%20Aaas/src/components/dashboard/DeployView.tsx)
- **Remediation:** Removed unused variables (`total_s`, `test_q`, `custom_url`, `api_key`), connected ticket subject parameter, and removed unwanted UI badge.
- **Verification:** `ruff check --select F401,F841` passed; `npx tsc --noEmit` passed.

---

## 3. Summary of Regression Tests

| Test Suite | File | Tests Executed | Result |
| :--- | :--- | :--- | :--- |
| **Backend Unit & RAG** | [`test_rag_pipeline.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/backend_python/tests/test_rag_pipeline.py) | 12 | **12/12 PASSED** |
| **Route Auth & RBAC** | [`test_route_authentication.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/backend_python/tests/test_route_authentication.py) | 6 | **6/6 PASSED** |
| **Tenant Isolation & Billing** | [`test_tenant_isolation.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/backend_python/tests/test_tenant_isolation.py) | 11 | **11/11 PASSED** |
| **Frontend Unit** | [`aiEngine.test.ts`](file:///c:/Users/91730/Downloads/Chat%20Aaas/src/__tests__/aiEngine.test.ts) | 3 | **3/3 PASSED** |
| **Penetration Defense** | [`scripts/pentest.py`](file:///c:/Users/91730/Downloads/Chat%20Aaas/scripts/pentest.py) | 11 | **11/11 PASSED** |

**Total Verified Tests: 43/43 Passing (100% Success Rate).**
