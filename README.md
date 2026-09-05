# 🤖 Chat-AaaS — Enterprise Agent-as-a-Service Platform
> **Enterprise-Ready, YC-Level AI Employee Management Platform built with a TypeScript + Python Hybrid Architecture.**

---

## 🌟 Overview & Product Mental Model

Chat-AaaS transforms technical AI agent management into an intuitive business platform:
\textbf{Company} \longrightarrow \textbf{AI Agent} \longrightarrow \textbf{Teach It} \longrightarrow \textbf{Give It Tools} \longrightarrow \textbf{Deploy Everywhere}

- **1 Company = 1 Unified Agent**: Eliminates multi-bot clutter; every organization configures and trains a single autonomous AI employee with draft/published version snapshots.
- **TypeScript + Python Hybrid Power**: TypeScript handles user experience, API routing, multi-tenancy, RBAC, GST billing, and live support inbox. Python handles vector embeddings, semantic reranking, document intelligence, and hallucination scoring.
- **Enterprise Security & Reliability**: Complete tenant isolation at the database layer, SSRF defense on URL crawling, 3-tier action confirmation gates for high-risk operations, and a 3-state circuit breaker with local BM25 fallbacks.

---

## 🏗️ System Architecture

`
                                +-------------------------------------------+
                                |          React 19 + Tailwind UI           |
                                |  * 3-Pane Inbox  * Test Playground        |
                                |  * ROI Analytics * Live Preview Embed     |
                                +---------------------+---------------------+
                                                      |
                                                      v
                                +-------------------------------------------+
                                |   TypeScript Node.js API & Orchestrator   |
                                |  * Multi-Tenancy  * RBAC Matrix           |
                                |  * 18% GST Billing * Action Confirmation  |
                                |  * Circuit Breaker * Local BM25 Engine    |
                                +---------------------+---------------------+
                                                      |
                         +----------------------------+----------------------------+
                         | (X-Internal-Token / X-Tenant-ID / X-Request-ID)          |
                         v                                                         v
+-------------------------------------------------+     +------------------------------------------+
|       Python FastAPI AI Microservice Layer      |     |             SQLite Database              |
|  * Dense Embeddings (1536 dimensions)           |     |  * Strict tenant-isolated entities       |
|  * Cross-Encoder Semantic Reranker              |     |  * Version snapshots & Audit logs        |
|  * RAG Faithfulness & Hallucination Evaluator   |     |  * Append-only usage metering ledger     |
|  * Document Intelligence & Semantic Chunking    |     +------------------------------------------+
|  * NLP Classification & Sentiment Engine        |
+-------------------------------------------------+
`

---

## 🚀 Key Features

1. **3-Pane Support Inbox**: Real-time conversation triage with sentiment badges, live message history, AI reasoning drawer, and staff human takeover.
2. **Draft -> Publish -> Rollback Versioning**: Edit agent settings safely in draft mode, publish version snapshots with changelogs, or rollback in 1-click.
3. **SSRF-Protected Knowledge Ingestion**: Ingest PDFs, Markdown, URLs, or FAQs with semantic chunking and automated crawler safety protection.
4. **Action Confirmation Gates**: Distinguish between read-only actions and high-risk operations (e.g., executing refunds or restarting infrastructure).
5. **Indian GST & Usage-Based Billing**: Automated 18% GST calculation (CGST + SGST or IGST) with itemized PDF-style invoices and usage metering.
6. **Resilient Circuit Breaker & Fallbacks**: If the Python AI service is ever offline, the TypeScript orchestrator automatically falls back to local BM25 lexical ranking and heuristic evaluation without user downtime.

---

## 🛠️ Quickstart & Local Setup

### 1. Installation
`ash
git clone https://github.com/Ajimsha1080/Chat-Aaas.git
cd Chat-Aaas
npm install
`

### 2. Environment Setup
`ash
cp .env.example .env
`

### 3. Start Python AI Microservice (FastAPI)
`ash
python -m uvicorn backend_python.app.main:app --host 127.0.0.1 --port 8000 --reload
`

### 4. Start TypeScript Application & Web UI
`ash
npm run dev
`

---

## 🧪 Automated Testing Suite

Chat-AaaS includes end-to-end automated test suites spanning both TypeScript and Python:

`ash
# Run all test suites (15 TypeScript + 10 Python suites)
npm run test:all

# Run Node.js / TypeScript test runner
npm test

# Run Python AI FastAPI test suite
npm run test:python

# Production build verification
npm run build
`

---

## 📁 Repository Structure

`
Chat-Aaas/
├── backend_python/            # Python FastAPI AI Microservice
│   ├── app/
│   │   ├── main.py            # FastAPI App, Telemetry Middleware & Endpoints
│   │   ├── schemas.py         # Pydantic v2 Models & API Contracts
│   │   ├── services/          # AI Microservices (Embeddings, Reranker, RAG Eval, DocAI, NLP)
│   │   └── tests/             # Automated Python Test Suite (10 suites)
├── docs/                      # Comprehensive Enterprise Documentation
│   ├── architecture/          # Overview & TypeScript-Python Hybrid Specs
│   ├── security/              # Multi-Tenancy, RBAC & SSRF Defense Specs
│   ├── development/           # Local Development Guide
│   └── api/                   # API Specifications
├── server/                    # TypeScript Node.js Backend & API Gateway
│   ├── db/                    # Multi-Tenant SQLite Database & Schemas
│   ├── middleware/            # Security, SSRF & RBAC Middlewares
│   ├── routes/                # Node.js API Router
│   ├── services/              # Orchestrator, Billing, Inbox, Tools & PythonAiClient
│   └── tests/                 # Automated TypeScript Test Runner (15 suites)
├── src/                       # React 19 Frontend (Tailwind CSS, Lucide, Recharts)
├── .env.example               # Environment Variables Template
└── package.json               # Scripts and Dependencies
`

---

## 📄 License
MIT License. Built for production Agent-as-a-Service deployments.\n