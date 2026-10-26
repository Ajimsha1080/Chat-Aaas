# CoarAI Empirical Test Execution & Results Report

**Report Date:** October 26, 2026  
**Execution Environment:** Windows 11 / Node.js 24 / Python 3.14 & 3.11 / PostgreSQL 16 + pgvector / Redis 7  
**Test Harnesses:** Pytest 9.1.1, Vitest 4.1.12, TypeScript 6.0.2, Ruff 0.15.5, Alembic 1.15.1  

---

## 1. Test Execution Summary

| Test Suite / Tool | Command Executed | Tests Run | Passed | Failed | Exit Code |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Backend Pytest** | `python -m pytest backend_python/tests -v` | 29 | 29 | 0 | `0` |
| **Frontend Vitest** | `npm test` (`vitest run`) | 3 | 3 | 0 | `0` |
| **Penetration Defense** | `python scripts/pentest.py` | 11 | 11 | 0 | `0` |
| **TypeScript Typecheck** | `npx tsc --noEmit` | N/A | N/A | 0 | `0` |
| **Strict Typecheck** | `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` | N/A | N/A | 0 | `0` |
| **Ruff Code Quality** | `python -m ruff check backend_python` | N/A | N/A | 0 | `0` |
| **Alembic Migration Drift**| `python -m alembic check` | Schema | 0 Drift | 0 | `0` |
| **Frontend Production Build**| `npm run build` (`vite build`) | 2792 modules | Success | 0 | `0` |
| **Live Integration Probes**| `python backend_python/tests/live_http_verification.py` | 6 probes | 6 | 0 | `0` |

---

## 2. Itemized Test Results

### Suite A: Backend Integration & Isolation (`pytest backend_python/tests`)

```text
backend_python/tests/test_rag_pipeline.py::test_exact_factual_lookup PASSED              [  3%]
backend_python/tests/test_rag_pipeline.py::test_semantic_paraphrasing_retrieval PASSED   [  6%]
backend_python/tests/test_rag_pipeline.py::test_query_rewriter_coreference_and_ordinals PASSED [ 10%]
backend_python/tests/test_rag_pipeline.py::test_comparison_reasoning PASSED              [ 13%]
backend_python/tests/test_rag_pipeline.py::test_multi_document_synthesis PASSED          [ 17%]
backend_python/tests/test_rag_pipeline.py::test_numerical_and_table_lookup PASSED        [ 20%]
backend_python/tests/test_rag_pipeline.py::test_crawler_html_cleaning_and_table_preservation PASSED [ 24%]
backend_python/tests/test_rag_pipeline.py::test_unknown_query_graceful_refusal PASSED    [ 27%]
backend_python/tests/test_rag_pipeline.py::test_strict_multi_tenant_isolation PASSED     [ 31%]
backend_python/tests/test_rag_pipeline.py::test_lifecycle_state_filtering PASSED         [ 34%]
backend_python/tests/test_rag_pipeline.py::test_conversational_greetings PASSED          [ 37%]
backend_python/tests/test_rag_pipeline.py::test_prompt_injection_sanitization PASSED     [ 41%]
backend_python/tests/test_route_authentication.py::test_unauthenticated_routes_return_401 PASSED [ 44%]
backend_python/tests/test_route_authentication.py::test_post_companies_requires_authentication_and_permission PASSED [ 48%]
backend_python/tests/test_route_authentication.py::test_spoofed_company_header_returns_401 PASSED [ 51%]
backend_python/tests/test_route_authentication.py::test_access_token_expiry_matches_15_minutes PASSED [ 55%]
backend_python/tests/test_route_authentication.py::test_api_keys_hashed_at_rest_and_verified_in_constant_time PASSED [ 58%]
backend_python/tests/test_route_authentication.py::test_metrics_endpoint_protected_from_public_access PASSED [ 62%]
backend_python/tests/test_tenant_isolation.py::test_postgresql_rls_session_isolation PASSED [ 65%]
backend_python/tests/test_tenant_isolation.py::test_endpoint_cross_tenant_isolation_agents PASSED [ 68%]
backend_python/tests/test_tenant_isolation.py::test_endpoint_cross_tenant_isolation_knowledge PASSED [ 72%]
backend_python/tests/test_tenant_isolation.py::test_endpoint_cross_tenant_isolation_conversations PASSED [ 75%]
backend_python/tests/test_tenant_isolation.py::test_endpoint_cross_tenant_isolation_companies PASSED [ 79%]
backend_python/tests/test_tenant_isolation.py::test_endpoint_cross_tenant_isolation_developer_keys PASSED [ 82%]
backend_python/tests/test_storage_tenant_prefix_isolation PASSED                          [ 86%]
backend_python/tests/test_tenant_isolation.py::test_monthly_token_and_cost_cap_enforcement PASSED [ 89%]
backend_python/tests/test_tenant_isolation.py::test_razorpay_webhook_signature_and_idempotency PASSED [ 93%]
backend_python/tests/test_tenant_isolation.py::test_email_single_use_expiring_tokens PASSED [ 96%]
backend_python/tests/test_tenant_isolation.py::test_gdpr_data_export_and_right_to_erasure PASSED [100%]

======================== 29 passed, 1 warning in 8.31s ========================
```

---

### Suite B: Penetration Defense (`python scripts/pentest.py`)

```text
[THWARTED] Attack 1: Header Spoofing (x-company-id: comp-coarai unauthenticated): Server returned HTTP 401
[THWARTED] Attack 2: Role Escalation via Spoofed Header: Server returned HTTP 401
[THWARTED] Attack 3: Unauthenticated Workspace Provisioning (POST /companies): Server returned HTTP 401
[THWARTED] Attack 4: Member Privilege Escalation (Missing company:create): Server returned HTTP 403
[THWARTED] Attack 5: Cross-Tenant Agent Enumeration: Tenant A was unable to inspect Tenant B agent configuration
[THWARTED] Attack 6: Cross-Tenant Object Storage Traversal: StorageService blocked unauthorized prefix and returned None
[THWARTED] Attack 7: Forged Razorpay Webhook HMAC-SHA256 Signature Injection: PaymentService rejected forged signature
[THWARTED] Attack 8: Payment Webhook Replay / Duplicate Attack: Replay detected and ignored: reason=duplicate_event
[THWARTED] Attack 9: Single-Use Cryptographic Email Token Reuse: Token invalidated upon first consumption
[THWARTED] Attack 10: Unauthenticated Prometheus Metrics APM Scraping: Server returned HTTP 401
[THWARTED] Attack 11: LLM Execution Past Monthly Token Cap: UsageService detected quota exceedance: HTTP 402

PENETRATION DEFENSE RESULTS: 11/11 attacks successfully neutralized.
```

---

### Suite C: Frontend Unit & Client AI (`npm test`)

```text
 RUN  v4.1.12 C:/Users/91730/Downloads/Chat Aaas

 ✓ src/__tests__/aiEngine.test.ts (3 tests) 10ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Duration  4.45s
```

---

### Suite D: Live E2E Integration Pipeline Probes

```text
--- 1. Testing System Health & Readiness ---
Health Response (200): {'status': 'healthy', 'service': 'CoarAI Python Enterprise & AI Specialized Runtime', 'version': '2.0.0', 'uptime_seconds': 84976.65}

--- 2. Ingesting Document into Knowledge Base ---
Ingest Status: 201 | Chunks Created: 4

--- 3. Testing Factual Lookup ('What is the price of the Professional plan?') ---
Bot Answer: The Professional plan is $99 per month.
Citations: ['CoarAI Enterprise Guide'] | Confidence: 0.8772

--- 4. Testing Multi-Turn Coreference Follow-up ('How many tokens does it include?') ---
Bot Follow-up Answer: The Professional plan includes 500,000 monthly tokens.

--- 5. Testing Comparison Query ('Compare Starter and Professional plans') ---
Comparison Answer: Starter ($29/mo, 50,000 tokens) vs Professional ($99/mo, 500,000 tokens).

--- 6. Testing Out-of-Domain Refusal ('What is the recipe for pizza dough?') ---
Refusal Answer: I don't have enough verified information to answer that question accurately.
Is Refusal: True
```
