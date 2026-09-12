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

### 1. ONE Prebuilt AI Q&A Assistant
- **Strict 1:1 Company Mapping**: Every business receives one dedicated, pre-configured Q&A Assistant.
- **Enterprise Lifecycle & Versioning**: Complete state machine (`Draft` → `Ready` → `Published` → `Disabled` → `Archived` → `Deleted`) with immutable version snapshots, change summaries, and 1-click rollbacks.
- **Dependency-Aware Protection**: Safety checks warn users of active websites, mobile apps, or API channels before disabling or unpublishing an assistant.
- **Identity & Tone Customization**: Tone presets (Professional, Friendly, Empathetic, Direct, Technical), custom greetings, fallback messages, and plain-English safety rules.

### 2. Multi-Tenant Knowledge Base & Grounded RAG
- **5-Stage Telemetry Pipeline**: Real-time progress tracking through `UPLOADING` → `PARSING` → `CHUNKING` → `EMBEDDING` → `INDEXING` → `READY`.
- **Trash & 30-Day Retention**: Soft-delete knowledge to Trash where documents are immediately excluded from live RAG retrieval; 1-click restore re-indexes vector chunks automatically.
- **Permanent Purge**: Complete eradication of original files, parsed content, document chunks, vector embeddings, and search references with typed confirmation (`DELETE PERMANENTLY`).
- **SSRF Crawler Defense**: Proactively blocks private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.1`, `localhost`), and cloud metadata (`169.254.169.254`).
- **Anti-Hallucination Threshold**: Strict confidence evaluation — if verified knowledge is insufficient, the assistant honestly refuses to answer rather than hallucinating.
- **Knowledge Gaps Triage**: Automatically captures unanswered user questions so teams can convert them into FAQs with 1 click.

### 3. Multi-Channel Distribution Hub
- **Independent Deployment Channels**: Website widgets, React iframes, REST API, and Webhooks can be independently created, paused, disabled, or removed without impacting the core assistant.
- **Website Embed Widget**: Fast, responsive HTML `<script>` embed with custom branding, placement, and sound effects.
- **REST API & Developer Credentials**: Hashed API key storage, one-time secret revelation, instant rotation, and immediate revocation.
- **Enterprise Webhook Deliveries**: Webhook endpoints with delivery logs, HTTP response codes, latency tracking (ms), and failure retries.

### 4. Conversations & Live Human Takeover
- **Conversation Inbox**: Real-time persisted customer threads with multi-select bulk archive and bulk deletion.
- **Citation Inspection**: Inspect source documents and confidence scores used for every generated answer.
- **1-Click Human Handoff**: Seamlessly escalate from AI to live operator with status tracking (`AI Active`, `Human Requested`, `Human Active`, `Resolved`).

### 5. Indian GST (18%) Billing & Metering
- **Transparent Tier Pricing**: Starter (₹4,999/mo), Growth (₹14,999/mo), and Enterprise Business (₹39,999/mo).
- **Automated GST Tax Invoicing**: Calculates 9% CGST + 9% SGST (intra-state) or 18% IGST (inter-state) with PDF downloads.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+ and npm
- Python 3.11+
- PostgreSQL 16 with pgvector & Redis 7 (or Docker)

### 1. Start Python Backend
```powershell
cd backend_python
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8001
```

### 2. Start React Frontend
```powershell
npm install
npm run dev
```

Visit the dashboard at `http://localhost:5173`.

---

## 🐳 Docker Deployment

Run the complete 5-service production stack:

```powershell
docker-compose up -d --build
```

---

## 🧪 Testing & Verification

### Run Backend Pytest Suite (42/42 tests passing):
```powershell
python -m pytest backend_python/app/tests/ -v
```
Includes:
- Full end-to-end fresh customer lifecycle test (`test_production_e2e_customer.py`) starting from empty database to signup, clean workspace verification, honest refusal, document ingestion, RAG answer, draft publishing, deployment, chat persistence, trash/restore, and multi-tenant security isolation.
- Resource lifecycles (`test_resource_lifecycle.py`), agent versioning (`test_agent_lifecycle.py`), authentication (`test_auth.py`), RBAC permissions, and SSRF crawler defenses.

### Run Frontend Production Build:
```powershell
npm run build
```