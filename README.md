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
- **Draft → Test → Publish → Rollback**: Edit draft configurations in isolation, publish immutable version releases, and perform 1-click rollbacks.
- **Identity & Tone Customization**: Tone presets (Professional, Friendly, Empathetic, Direct, Technical), custom greeting, and plain-English business rules.

### 2. Multi-Tenant Knowledge Base & Grounded RAG
- **Multi-Modal Ingestion**: Ingest PDFs, DOCX, TXT, FAQs, and Website URLs with automatic chunking and vector embeddings.
- **SSRF Crawler Defense**: Proactively blocks private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.1`, `localhost`), and cloud metadata (`169.254.169.254`).
- **Anti-Hallucination Threshold**: Strict confidence evaluation — if verified knowledge is insufficient, the assistant gracefully provides a fallback message or human handoff.
- **Knowledge Gaps Triage**: Automatically captures unanswered user questions so teams can convert them into FAQs with 1 click.

### 3. Multi-Channel Distribution Hub
- **Website Embed Widget**: Fast, responsive HTML `<script>` embed with custom branding and placement controls.
- **React SDK & Iframe**: Drop-in React components and embedded chat frames.
- **REST API & Webhooks**: Developer-friendly endpoints for querying the assistant from mobile apps and external backend services.

### 4. Conversations & Live Human Takeover
- **Conversation Inbox**: Filter by Answered, Unanswered, and Human Handoffs.
- **Citation Inspection**: Inspect source documents used for every generated answer.
- **1-Click Human Handoff**: Seamlessly transition from AI to live operator.

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
uvicorn app.main:app --reload --port 8001
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

## 🧪 Testing

### Run Backend Unit & Integration Tests:
```powershell
python -m pytest backend_python/app/tests/ -v
```

### Run Frontend Production Build:
```powershell
npm run build
```