# 🤖 CoarAI — Enterprise AI Assistant Platform

[![CI/CD Pipeline](https://github.com/Ajimsha1080/Chat-Aaas/actions/workflows/ci.yml/badge.svg)](https://github.com/Ajimsha1080/Chat-Aaas/actions/workflows/ci.yml)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20(Python%203.11+)-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019%20+%20TypeScript-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20+%20pgvector-336791.svg?logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Redis](https://img.shields.io/badge/Cache%20&%20Workers-Redis%207-DC382D.svg?logo=redis&logoColor=white)](https://redis.io)

**CoarAI** is a production-grade, enterprise AI Q&A Assistant SaaS platform built around a single core promise:

> **"Create one AI assistant for your business. Add your knowledge. Deploy it anywhere."**

---

## 🔁 Core Product Loop

```text
GET ASSISTANT
      ↓
ADD KNOWLEDGE (Website / Docs / FAQs)
      ↓
CONFIGURE IDENTITY & TONE
      ↓
TEST IN PLAYGROUND
      ↓
PUBLISH
      ↓
DEPLOY (Website Widget / API / App)
      ↓
ANSWER QUESTIONS 24/7
      ↓
REVIEW INBOX & KNOWLEDGE GAPS
      ↓
IMPROVE KNOWLEDGE
```

---

## 🏛️ System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│             React 19 + TypeScript Frontend                  │
│       (Customer Workspace · Super Admin · Developer)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / SSE Streaming
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          Python FastAPI Primary Backend (/api/v1)           │
│   Auth · Multi-Tenancy · Assistant · RAG · Knowledge · GST  │
└───────┬──────────────────────┬───────────────────────┬──────┘
        │                      │                       │
        ▼                      ▼                       ▼
┌──────────────┐       ┌──────────────┐        ┌──────────────┐
│  PostgreSQL  │       │    Redis     │        │ Asynchronous │
│  + pgvector  │       │ Queue/Cache  │        │   Workers    │
└──────────────┘       └──────────────┘        └──────────────┘
```

### Core Technology Stack
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Lucide Icons, Recharts.
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0 (async), pgvector.
- **AI/ML Runtime**: Multi-provider LLM (OpenAI, Anthropic, Gemini, Ollama), Cross-Encoder Reranker, RAG Evaluator, Document AI semantic chunker.
- **Security & Multi-Tenancy**: Strict JWT authentication, Argon2/SHA-256 password hashing, SSRF-guarded knowledge crawler, tenant isolation per business.
- **Workers**: Redis-backed async workers for heavy document parsing, offline RAG evaluations, and resilient webhook delivery.

---

## ⚡ Key Platform Capabilities

### 1. Simplified 9-Tab Enterprise Workspace
- **Executive Overview**: High-impact KPI outcome cards (`Total Inquiries`, `Questions Answered`, `Resolution Rate %`, `Unanswered Questions`), real-time assistant status banner, and getting started checklist.
- **My Assistant**: Intuitive configuration of assistant identity, persona tone presets (Professional, Friendly, Empathetic, Direct), custom greetings, fallback responses, and simple lifecycle states (`Published`, `Draft changes pending`, `Paused`).
- **Knowledge Base**: Simplified source ingestion for Websites, Documents (PDF/TXT/DOCX), and FAQs with clean business statuses (`✓ Ready`, `Processing...`, `⚠ Needs attention`).
- **Dedicated Playground**: Split-screen workbench with live chat simulator, response source inspector citing verified knowledge, 👍 / 👎 feedback rating, and 1-click `[Teach New Answer]`.
- **Conversations & Unanswered Questions**: Complete customer inbox with live staff takeover and an **Unanswered Questions** tab for continuous improvement.
- **Deploy**: Real-time website widget customizer (color, positioning, greeting), copy-paste `<script>` tag, React component embed, and REST API.
- **Analytics & Insights**: Outcome-driven KPIs (autonomous resolution rate, inquiries handled, staff time saved, top customer inquiry topics).
- **Billing & Plans**: Standalone subscription management, monthly usage meters (inquiries and documents), and tax invoices.
- **Settings & Developer**: Consolidated company profile, team access control, security audit trail, and developer API credentials.

### 2. Dedicated Side-by-Side Playground
- **Live Simulator**: Test how the assistant answers customer questions before publishing changes.
- **Source Inspection**: Inspect exact verified documents and citations referenced in every response.
- **Continuous Calibration**: Rate responses with `[👍 Good answer]` or `[👎 Needs improvement]`, and use `[Teach New Answer]` to instantly store approved answers into the knowledge base.

### 3. Multi-Tenant Knowledge Base & Grounded RAG
- **5-Stage Telemetry Pipeline**: Real-time progress tracking through `UPLOADING` → `PARSING` → `CHUNKING` → `EMBEDDING` → `INDEXING` → `READY`.
- **Trash & 30-Day Retention**: Soft-delete knowledge to Trash where documents are immediately excluded from live RAG retrieval; 1-click restore re-indexes knowledge sources automatically.
- **Permanent Purge**: Complete eradication of original files, parsed content, document chunks, vector embeddings, and search references with typed confirmation (`DELETE PERMANENTLY`).
- **SSRF Crawler Defense**: Proactively blocks private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.1`, `localhost`), and cloud metadata (`169.254.169.254`).
- **Anti-Hallucination Threshold**: Strict confidence evaluation — if verified knowledge is insufficient, the assistant honestly refuses to answer rather than hallucinating.
- **Unanswered Questions Triage**: Automatically captures escalated or low-confidence user queries so teams can convert them into verified FAQs with 1 click.

### 4. Multi-Channel Distribution Hub
- **Independent Deployment Channels**: Website widgets, React iframes, REST API, and Webhooks can be independently created, paused, disabled, or removed without impacting the core assistant.
- **Website Embed Widget**: Fast, responsive HTML `<script>` embed with custom branding, placement, and sound effects.
- **REST API & Developer Credentials**: Hashed API key storage, one-time secret revelation, instant rotation, and immediate revocation.
- **Enterprise Webhook Deliveries**: Webhook endpoints with delivery logs, HTTP response codes, latency tracking (ms), and failure retries.

### 5. Conversations & Live Human Takeover
- **Conversation Inbox**: Real-time persisted customer threads with multi-select bulk archive and bulk deletion.
- **Citation Inspection**: Inspect source documents and confidence scores used for every generated answer.
- **1-Click Human Handoff**: Seamlessly escalate from AI to live operator with status tracking (`AI Active`, `Human Requested`, `Human Active`, `Resolved`).

### 6. Indian GST (18%) Billing & Metering
- **Transparent Tier Pricing**: Starter (₹4,999/mo), Growth (₹14,999/mo), and Enterprise Business (₹39,999/mo).
- **Automated GST Tax Invoicing**: Calculates 9% CGST + 9% SGST (intra-state) or 18% IGST (inter-state) with PDF downloads.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+ and npm
- Python 3.11+
- PostgreSQL 16 with pgvector & Redis 7 (or Docker)

### 1. Configure Environment Variables
```powershell
cp .env.example .env
cp .env.example backend_python/.env
```

### 2. Start Python Backend
```powershell
cd backend_python
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8001
```

### 3. Start React Frontend
```powershell
npm install
npm run dev
```

Visit the dashboard at `http://localhost:5173`.

---

## 🐳 Docker Deployment

Run the complete 5-service production stack (PostgreSQL + pgvector, Redis, FastAPI Backend, Async Worker, Nginx SPA):

```powershell
docker-compose up -d --build
```

---

## 🧪 Testing & Verification

### Run Backend Pytest Suite (57/57 tests passing):
```powershell
python -m pytest backend_python/app/tests/ -v
```
Includes:
- **Round 2 Production Completion** (`test_round2_production_completion.py`): Authoritative SQL persistence across reloads (`load_from_database` / `flush_durable_storage`), cross-process distributed worker `JobQueue` backed by Redis & durable `BackgroundJob` table with atomic claims, strict eradication of unassociated tenant fallbacks in `AuthService`, dynamic tool execution without fake mock data, real integration network handshake latency measurement (`perf_counter`), protected specialized AI endpoints (`/v1/embeddings`, `/v1/rerank`, etc.), and live database/worker readiness checks.
- **Production Features & Hardening** (`test_production_features.py`): Real SSE token streaming without simulated word splitting, 6-stage human handoff lifecycle (`ai_active` → `handoff_requested` → `assigned` → `human_active` → `resolved` → `closed`) with automated AI reply suppression during human operator sessions, tool idempotency key replay caching, multi-connection integrations with unique UUID IDs, and asynchronous queue workers with HMAC-SHA256 signature generation.
- **Full End-to-End Fresh Customer Lifecycle** (`test_production_e2e_customer.py`): Starts from empty database to signup, clean workspace verification, honest refusal, document ingestion, RAG answer, draft publishing, deployment, chat persistence, trash/restore, and multi-tenant security isolation.
- **SSRF Multi-Hop Redirect Defense** (`test_rag_and_ssrf.py`): Verifies that direct targets and multi-hop HTTP 301/302 redirects to cloud metadata (`169.254.169.254`), loopback (`127.0.0.1`), and RFC1918 private subnets are strictly intercepted and blocked.
- **Tenant Billing & GST Invoicing** (`test_billing_and_gst.py`): Verifies plan catalog, Indian GST (18%) intra/inter-state tax breakdown, upgrade generation, and multi-tenant invoice isolation (`GET /api/v1/billing/invoices`).
- **Resource Lifecycles & 1:1 Schema Constraint** (`test_resource_lifecycle.py`, `models.py`): Enforces 1 AI assistant per company invariant, version draft/publish/rollback, API keys, webhooks, and tool risk gates.
- **Authentication & RBAC** (`test_auth.py`, `test_multi_tenancy.py`): JWT token verification, password hashing, and role permissions.

### Run Frontend Production Build:
```powershell
npm run build
```
Production build compiles with zero errors in ~6s with split vendor chunks and optimized public widget.