# 🤖 Chat-AaaS — Enterprise Agent-as-a-Service (AaaS) Platform

[![CI/CD Pipeline](https://github.com/Ajimsha1080/Chat-Aaas/actions/workflows/ci.yml/badge.svg)](https://github.com/Ajimsha1080/Chat-Aaas/actions/workflows/ci.yml)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20(Python%203.11+)-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019%20+%20TypeScript-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20+%20pgvector-336791.svg?logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Redis](https://img.shields.io/badge/Cache%20&%20Workers-Redis%207-DC382D.svg?logo=redis&logoColor=white)](https://redis.io)

**Chat-AaaS** is a production-grade, enterprise Agent-as-a-Service (AaaS) platform designed around a singular product philosophy:

> *"The customer should feel like they are hiring and managing an autonomous AI employee, not configuring an AI infrastructure platform."*

---

## 🏛️ System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│             React 19 + TypeScript Frontend                  │
│       (Customer Workspace · Admin Platform · Developer)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / SSE
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          Python FastAPI Primary Backend (/api/v1)           │
│   Auth · RBAC · Multi-Tenancy · Agents · RAG · Actions · GST│
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
- **AI/ML Runtime**: Multi-provider LLM (OpenAI, Anthropic, Gemini, Ollama), Cross-Encoder Reranker, RAG Evaluator, Document AI, NLP Intent Classifier.
- **Security & Multi-Tenancy**: Strict JWT authentication, Argon2/SHA-256 password hashing, SSRF-guarded knowledge crawler, 3-tier risk action confirmation gates.
- **Workers**: Redis-backed async workers for heavy document parsing, offline RAG evaluations, and resilient webhook delivery.

---

## ⚡ Key Features

### 1. AI Employee Management & Lifecycle
- **Draft → Test → Publish → Rollback**: Edit draft configurations in isolation, publish immutable version releases with changelogs, and perform 1-click rollbacks to any previous version.
- **Strict 1:1 Company Mapping**: Each organization has a single, dedicated, high-context AI Employee.

### 2. Multi-Tenant Knowledge Base & RAG Pipeline
- **Multi-Modal Ingestion**: Ingest PDFs, DOCX, TXT, and Web URLs with automatic chunking and 1536-dimension embeddings.
- **SSRF Crawler Defense**: Proactively blocks private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.1`, `localhost`), and cloud metadata (`169.254.169.254`).
- **Cross-Encoder Semantic Reranking**: Re-orders candidate chunks for high relevance and suppresses hallucinations.

### 3. Business Actions & 3-Tier Risk Safety Gates
- **Read-Only**: Unrestricted lookup operations (e.g., check cluster health, order status).
- **Low-Risk**: Safe modifications (e.g., update profile tags).
- **High-Risk**: Financial or destructive operations (e.g., issue refunds, reboot compute clusters) that require explicit user confirmation prompts before execution.

### 4. Support Inbox & Real-Time Handoff
- **3-Pane Support Inbox**: Customer queue, live conversation history, and customer metadata panel.
- **1-Click Human Takeover**: Seamlessly transition conversations from autonomous AI to live human agents.

### 5. Indian GST (18%) Billing & Metering
- **Transparent Tier Pricing**: Starter (₹4,999/mo), Growth (₹14,999/mo), and Enterprise Business (₹39,999/mo).
- **Automated GST Tax Invoicing**: Calculates 9% CGST + 9% SGST (intra-state) or 18% IGST (inter-state) with PDF generation.

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
uvicorn app.main:app --reload --port 8000
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

```bash
docker-compose up --build -d
```

| Service | Port | Description |
| :--- | :--- | :--- |
| **frontend** | `80` | React web application served via Nginx |
| **backend** | `8000` | FastAPI core REST API & AI specialized runtime |
| **worker** | — | Python async worker processing background tasks |
| **postgres** | `5432` | PostgreSQL 16 database with pgvector extension |
| **redis** | `6379` | Redis 7 cache and async task queue |

---

## 🧪 Automated Testing

Run the full automated test suite:

```powershell
# Run Python Pytest Suite (29 unit & integration tests)
python -m pytest backend_python/app/tests -v

# Run Frontend Typecheck and Production Build
npm run build
```

---

## 📄 License
Enterprise Proprietary — Copyright © 2026 Chat-AaaS Inc.