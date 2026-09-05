# Agent-as-a-Service (AaaS) Enterprise Multi-Tenant Platform

[![CI/CD Pipeline](https://github.com/agent-as-a-service/aaas/actions/workflows/ci.yml/badge.svg)](https://github.com/agent-as-a-service/aaas/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript: 5.x](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite: 8.x](https://img.shields.io/badge/Vite-8.x-purple.svg)](https://vitejs.dev/)

> **A commercial SaaS platform where each company rents and deploys strictly ONE dedicated AI business agent.**

---

## 1. Product Architectural Principle

* **Strictly 1 Company = 1 AI Agent**: Companies do not create multiple chatbots or build fragile custom agent graphs. The platform provides a hardened, battle-tested agent engine customized entirely through company knowledge, business rules, approved integrations, and enterprise guardrails.
* **Draft $\to$ Test $\to$ Publish $\to$ Rollback**: Production widgets and mobile SDKs only serve published, immutable agent version snapshots. Changes are staged in a sandboxed draft state and can be rolled back instantly with zero downtime.
* **Strict Multi-Tenancy**: All 22 database entities, vector embeddings, tool executions, and conversation logs enforce row-level `company_id` partitioning.
* **Hierarchical Anti-Hallucination Pipeline**: System Platform Safety $\to$ Company Persona & Instructions $\to$ RAG Knowledge Base $\to$ Least-Privilege Read APIs $\to$ Confirmation-Gated Action Tools $\to$ User Input.

---

## 2. Directory Structure

```text
+-- .github/workflows/ci.yml   # Automated CI/CD pipeline (Lint, Test, Build)
+-- Dockerfile                 # Multi-stage production container build
+-- docker-compose.yml         # Containerized orchestration (PostgreSQL + pgvector, Redis, Node.js)
+-- .env.example               # Complete environment variable configuration template
+-- server/                    # Enterprise Backend Architecture
¦   +-- db/
¦   ¦   +-- schema.ts          # 22 Normalized relational database schemas
¦   ¦   +-- database.ts        # Database engine & query layer
¦   ¦   +-- seed.ts            # Enterprise seed data (TechFlow Cloud, Apex Health)
¦   +-- middleware/
¦   ¦   +-- auth.ts            # JWT authentication & password hashing
¦   ¦   +-- tenant.ts          # Multi-tenant isolation & request scoping
¦   ¦   +-- rbac.ts            # Server-side RBAC (owner, admin, staff, super_admin)
¦   ¦   +-- security.ts        # SSRF defense, IP filtering & sanitization
¦   +-- services/
¦   ¦   +-- agentRuntime.ts    # Reasoning engine & prompt composer
¦   ¦   +-- llmProvider.ts     # Multi-LLM provider abstraction (OpenAI, Claude, Gemini, Ollama)
¦   ¦   +-- ragEngine.ts       # Chunking, vector similarity & anti-hallucination evaluator
¦   ¦   +-- crawlerService.ts  # SSRF-protected website crawler
¦   ¦   +-- toolRegistry.ts    # JSON schema validator, action risk levels & execution handlers
¦   ¦   +-- integrationService.ts # KMS AES-256-GCM credential encryption & permission matrix
¦   ¦   +-- usageService.ts    # Append-only usage metering & quota enforcement
¦   ¦   +-- billingService.ts  # Subscriptions (Starter, Growth, Business, Enterprise), webhooks, GST invoices
¦   ¦   +-- backgroundQueue.ts # Asynchronous job processor
¦   ¦   +-- auditLogger.ts     # Immutable security audit trail
¦   +-- routes/
¦   ¦   +-- agentRoutes.ts     # Draft, publish, rollback versioning endpoints
¦   ¦   +-- apiRouter.ts       # Unified /api/v1 REST router
¦   +-- tests/
¦       +-- runTests.ts        # 13 Automated test suites
+-- public/
¦   +-- widget.js              # Lightweight, embeddable website widget script
+-- src/                       # Frontend SPA (React 19 + TypeScript + Tailwind CSS)
¦   +-- api/apiClient.ts       # Unified client interfacing with backend router
¦   +-- components/            # Production UI modules
¦   ¦   +-- AgentManagement.tsx    # Draft vs Published studio, real-time testing, version rollback
¦   ¦   +-- KnowledgeManager.tsx   # Document ingestion, crawler, FAQ management
¦   ¦   +-- IntegrationsHub.tsx    # CRM/Helpdesk/ERP connectors with permission scopes
¦   ¦   +-- DeploymentCenter.tsx   # Embed scripts, Webhook keys, Mobile SDK configs
¦   ¦   +-- ConversationsViewer.tsx# Live inbox, sentiment analysis, human-in-the-loop takeover
¦   ¦   +-- UsageAnalytics.tsx     # Message meters, token breakdown, response latency graphs
¦   ¦   +-- BillingManager.tsx     # Subscription tiers, credit packs, GST invoices
¦   ¦   +-- common/
¦   ¦       +-- TestRunnerModal.tsx# In-app interactive test runner
¦   ¦       +-- ErrorBoundary.tsx  # Production UI error boundary
¦   +-- types.ts               # Shared TypeScript domain contracts
```

---

## 3. Getting Started

### Prerequisites
- Node.js 20.x or 22.x LTS
- npm 10.x+

### Quick Start (Local Development)
```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env

# 3. Run automated backend verification test suite (13 suites)
npm test

# 4. Start local development server (Frontend + Mocked Production API Router)
npm run dev
```

### Running with Docker Compose
```bash
docker-compose up --build
```

---

## 4. Verification & Testing

The platform includes 13 automated backend test suites verifying all core enterprise constraints:

```bash
# Run oxlint static code analyzer
npm run lint

# Execute all automated platform test suites
npm test

# Compile TypeScript and build production bundle
npm run build
```

### Verified Test Suites
1. **Multi-Tenancy Isolation**: Ensures Cross-tenant reads fail and tenant boundary cannot be breached.
2. **SSRF Defense**: Prevents website crawler from targeting localhost, AWS metadata (`169.254.169.254`), or private subnets (`10.0.0.0/8`, `192.168.0.0/16`).
3. **1 Company = 1 Agent Enforcement**: Enforces that attempting to create a second agent per company is strictly rejected.
4. **Agent Versioning**: Tests Draft $\to$ Publish $\to$ Snapshot $\to$ Rollback lifecycle.
5. **Tool Schema Validation & Confirmation Gates**: Enforces input validation against JSON schemas and flags high-risk actions (`execute_refund`, `cancel_order`) for human confirmation.
6. **KMS Credential Encryption**: Verifies AES-256-GCM encryption of third-party API keys at rest.
7. **RAG Vector Search & Chunking**: Validates semantic retrieval with strict tenant filtering.
8. **Anti-Hallucination Evaluator**: Confirms fallback behavior when context relevance is below threshold.
9. **Usage Metering & Quotas**: Validates append-only usage ledger and quota rejection when limits are exceeded.
10. **RBAC Permission Scopes**: Verifies role permissions (`owner`, `admin`, `staff`).
11. **GST Tax Invoice Calculations**: Validates CGST/SGST invoice computations.
12. **Background Job Queue**: Validates async job state transitions and retry logic.
13. **Audit Trail Immutability**: Ensures tamper-evident logging of administrative actions.

---

## 5. Security Architecture

* **Zero-Trust Multi-Tenancy**: All database queries parameterize `company_id`. Client headers cannot spoof tenant context.
* **SSRF Protection**: Crawler validates resolved IP addresses against IPv4/IPv6 private subnets and cloud metadata endpoints before issuing outbound HTTP requests.
* **KMS Encryption**: Sensitive connector credentials and webhook secrets are encrypted using AES-256-GCM with distinct initialization vectors (IV) and authentication tags.
* **Human-in-the-Loop Safeguards**: High-impact transactional tools require explicit user or operator confirmation before mutating external business systems.

---

## 6. License
Enterprise Commercial License / MIT
