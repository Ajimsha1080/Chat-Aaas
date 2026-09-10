# CoarAI Platform Architecture Overview

## 1. Executive Summary
CoarAI is a production-grade, enterprise-ready **AI Agent Platform** designed with a high-performance **TypeScript + Python Hybrid Architecture**.

The product is organized around a simple mental model for business users:
\text{Company} \longrightarrow \text{AI Agent} \longrightarrow \text{Teach It} \longrightarrow \text{Give It Tools} \longrightarrow \text{Deploy Everywhere}

---

## 2. Hybrid Architecture Topology

`
+-----------------------------------------------------------------------------------+
|                            REACT 19 + VITE + TAILWIND UI                          |
|  * 3-Pane Support Inbox  * Playground  * Analytics  * Live Preview  * GST Invoicing|
+------------------------------------------+----------------------------------------+
                                           | HTTP / SSE / REST
                                           v
+-----------------------------------------------------------------------------------+
|                        TYPESCRIPT NODE.JS API & ORCHESTRATION                     |
|  * Multi-Tenancy & Partitioning          * Role-Based Access Control (RBAC)       |
|  * GST Billing & Usage Metering          * Background Asynchronous Job Queue      |
|  * Conversation & Handoff Management     * High-Risk Tool Confirmation Gates      |
|  * 3-State Circuit Breaker Client        * Local BM25 RAG Fallback Engine         |
+------------------------------------------+----------------------------------------+
                                           | Internal HMAC Auth (X-Internal-Token)
                                           | X-Tenant-ID & X-Request-ID Propagation
                                           v
+-----------------------------------------------------------------------------------+
|                          PYTHON FASTAPI AI MICROSERVICE                           |
|  * Dense Vector Embeddings (1536-dim)    * Cross-Encoder Semantic Reranking       |
|  * RAG Faithfulness & Hallucination Eval * Document Intelligence & Semantic Chunks|
|  * NLP Intent & Sentiment Classification * Streaming Reasoning Steps (SSE)        |
+-----------------------------------------------------------------------------------+
`

---

## 3. Core Principles
1. **Strict 1 Company = 1 Agent**: Eliminates workspace confusion; each organization customizes and trains a single unified AI employee.
2. **Deterministic Security**: Multi-tenancy isolation at every SQL and vector query boundary.
3. **High-Risk Confirmation Gates**: Write actions (e.g. refunds, node restarts) require human or customer confirmation before dispatch.
4. **Resilience & Fallbacks**: The TypeScript orchestrator seamlessly handles Python AI service downtime using local BM25 lexical ranking and heuristic evaluation.
