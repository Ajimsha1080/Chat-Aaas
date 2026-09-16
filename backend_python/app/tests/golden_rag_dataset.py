"""
Golden RAG Benchmark Dataset for CoarAI SaaS.
Contains 20 authoritative Ground-Truth Q&A pairs spanning enterprise architecture,
security invariants, Indian GST billing, agent runtime, RAG retrieval, and tool execution.
"""

GOLDEN_RAG_BENCHMARK = [
    {
        "id": "rag_01_deployment_architecture",
        "category": "Architecture",
        "query": "How does TechFlow Cloud deploy services into production and handle rollbacks?",
        "grounding_context": "TechFlow Cloud production deployment utilizes automated CI/CD pipelines, containerized microservices via Docker, and zero-downtime rolling deployments on multi-region Kubernetes clusters with automated health probes and SSL termination. Automated rollback initiates immediately if error rates exceed 0.1% or latency degrades.",
        "expected_answer": "TechFlow Cloud deploys containerized microservices using Docker on multi-region Kubernetes clusters with zero-downtime rolling deployments and CI/CD pipelines. Automated rollback initiates immediately if error rates exceed 0.1% or latency degrades.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    },
    {
        "id": "rag_02_multi_tenant_isolation",
        "category": "Security",
        "query": "What is the primary tenant isolation invariant in CoarAI?",
        "grounding_context": "Multi-tenant isolation is enforced at every layer using companyId partitions, database Row-Level Security, scoped Redis keys, and tenant-prefixed durable object storage. Tenant A can never access or query Tenant B's data.",
        "expected_answer": "Multi-tenant isolation is enforced using companyId partitions, database Row-Level Security, scoped Redis keys, and tenant-prefixed durable object storage so Tenant A can never access or query Tenant B's data.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    },
    {
        "id": "rag_03_gst_calculation",
        "category": "Billing",
        "query": "How is Indian GST calculated for intrastate versus interstate SaaS customers?",
        "grounding_context": "Under Indian GST regulations for IT software services (SAC 998313), an 18% tax is applied. For intrastate transactions within Karnataka, this splits into 9% CGST and 9% SGST. For interstate transactions outside Karnataka, the full 18% IGST is charged.",
        "expected_answer": "Under Indian GST regulations for IT software services (SAC 998313), an 18% tax applies: intrastate transactions within Karnataka split into 9% CGST and 9% SGST, while interstate transactions outside Karnataka are charged 18% IGST.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    },
    {
        "id": "rag_04_high_risk_tool_gates",
        "category": "Runtime",
        "query": "What happens when an AI assistant attempts to execute a high risk tool like refund processing?",
        "grounding_context": "When a tool is designated with a high_risk tier, autonomous execution is blocked. An ActionExecution record is created in a pending state, and explicit human confirmation is required via a confirmation prompt before the action can proceed.",
        "expected_answer": "When a tool is designated with a high_risk tier, autonomous execution is blocked, an ActionExecution record is created in pending state, and explicit human confirmation is required via a confirmation prompt before the action can proceed.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    },
    {
        "id": "rag_05_ssrf_crawler_defense",
        "category": "Security",
        "query": "How does the web crawler protect against SSRF attacks?",
        "grounding_context": "The crawler blocks private IPv4/IPv6 address ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8), cloud metadata endpoints (169.254.169.254), and local hostnames across all redirect hops with DNS validation.",
        "expected_answer": "The crawler blocks private IPv4/IPv6 address ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8), cloud metadata endpoints (169.254.169.254), and local hostnames across all redirect hops with DNS validation.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    },
    {
        "id": "rag_06_token_rotation_security",
        "category": "Authentication",
        "query": "How does refresh token rotation work in CoarAI?",
        "grounding_context": "Access tokens expire after 15 minutes. Refresh tokens are single-use with a 7-day lifespan. When a refresh token is exchanged, it is immediately revoked and replaced with a newly generated cryptographically signed token.",
        "expected_answer": "Access tokens expire after 15 minutes while refresh tokens are single-use with a 7-day lifespan; exchanging a refresh token revokes it and replaces it with a newly generated token.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    },
    {
        "id": "rag_07_human_handoff_trigger",
        "category": "Support",
        "query": "What triggers an automated human agent handoff in conversation sessions?",
        "grounding_context": "A conversation escalates to human handoff when customer trigger keywords (human, agent, manager, refund) are matched or when repeated unanswered queries exceed configured escalation thresholds.",
        "expected_answer": "A conversation escalates to human handoff when customer trigger keywords (human, agent, manager, refund) are matched or when repeated unanswered queries exceed configured escalation thresholds.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    },
    {
        "id": "rag_08_tool_idempotency",
        "category": "Runtime",
        "query": "How does tool execution caching prevent duplicate actions?",
        "grounding_context": "Tool executions require an idempotency key. If a request is received with an identical idempotency key for the tenant, the previously cached execution result is returned immediately without re-executing the external tool.",
        "expected_answer": "Tool executions require an idempotency key; if a request is received with an identical idempotency key for the tenant, the cached execution result is returned immediately without re-executing the tool.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    },
    {
        "id": "rag_09_rate_limiting_policy",
        "category": "Security",
        "query": "What rate limits protect the authentication and crawler endpoints?",
        "grounding_context": "Redis sliding-window rate limiting restricts authentication attempts to 10 requests per minute per IP, and limits web crawling ingestion to 5 requests per minute per tenant to prevent resource exhaustion and abuse.",
        "expected_answer": "Redis sliding-window rate limiting restricts authentication attempts to 10 requests per minute per IP, and limits web crawling ingestion to 5 requests per minute per tenant.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    },
    {
        "id": "rag_10_emergency_killswitch",
        "category": "Administration",
        "query": "What is the function of the global AI killswitch?",
        "grounding_context": "The platform super admin can activate an emergency global AI killswitch that halts all autonomous agent reasoning, chat generation, and tool executions platform-wide while maintaining administrative UI and audit access.",
        "expected_answer": "The platform super admin can activate an emergency global AI killswitch that halts all autonomous agent reasoning, chat generation, and tool executions platform-wide while maintaining administrative access.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    },
    {
        "id": "rag_11_durable_s3_storage",
        "category": "Storage",
        "query": "How are uploaded knowledge documents stored securely in S3?",
        "grounding_context": "Uploaded knowledge documents are encrypted at rest with AES-256 server-side encryption and stored under strict tenant prefixes {company_id}/{doc_id}/{filename} with presigned expiring URLs for downloads.",
        "expected_answer": "Uploaded knowledge documents are encrypted at rest with AES-256 server-side encryption and stored under strict tenant prefixes {company_id}/{doc_id}/{filename} with presigned expiring URLs.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    },
    {
        "id": "rag_12_webhook_signature_verification",
        "category": "Integrations",
        "query": "How are outbound webhooks authenticated and signed?",
        "grounding_context": "Outbound webhook events include an X-CoarAI-Signature header containing an HMAC-SHA256 signature calculated from the raw payload and tenant webhook secret.",
        "expected_answer": "Outbound webhook events include an X-CoarAI-Signature header containing an HMAC-SHA256 signature calculated from the raw payload and tenant webhook secret.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    },
    {
        "id": "rag_13_distributed_queue_dlq",
        "category": "Infrastructure",
        "query": "What happens when a background worker job fails after exhausting retries?",
        "grounding_context": "When a background job exceeds its maximum retry attempts, it is automatically routed to the Dead Letter Queue (DLQ) with status 'failed' or 'dlq', recording the error message, full stack trace, and original payload.",
        "expected_answer": "When a background job exceeds its maximum retry attempts, it is automatically routed to the Dead Letter Queue (DLQ) with status 'dlq', recording the error message, stack trace, and payload.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    },
    {
        "id": "rag_14_crawler_robots_compliance",
        "category": "Crawler",
        "query": "How does the crawler respect website crawler guidelines?",
        "grounding_context": "Before scraping a domain, the crawler checks robots.txt for User-agent rules, restricts crawling within the origin domain, enforces a 10MB size ceiling, and limits traversal depth to 3.",
        "expected_answer": "Before scraping a domain, the crawler checks robots.txt for User-agent rules, restricts crawling within the origin domain, enforces a 10MB size ceiling, and limits traversal depth to 3.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    },
    {
        "id": "rag_15_chat_quota_enforcement",
        "category": "Billing",
        "query": "What response is returned when a tenant exceeds their monthly conversation quota?",
        "grounding_context": "When a tenant exhausts their monthly conversation quota under their subscription tier, chat endpoints reject further AI conversations with HTTP 402 Payment Required and prompt an upgrade.",
        "expected_answer": "When a tenant exhausts their monthly conversation quota, chat endpoints reject further AI conversations with HTTP 402 Payment Required and prompt an upgrade.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    },
    {
        "id": "rag_16_sse_streaming_protocol",
        "category": "Runtime",
        "query": "How does the assistant stream real-time responses to web clients?",
        "grounding_context": "CoarAI provides a Server-Sent Events (SSE) streaming endpoint delivering chunk events in text/event-stream format, followed by token usage and citation metadata upon completion.",
        "expected_answer": "CoarAI provides a Server-Sent Events (SSE) streaming endpoint delivering chunk events in text/event-stream format, followed by token usage and citation metadata upon completion.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    },
    {
        "id": "rag_17_audit_log_immutability",
        "category": "Compliance",
        "query": "What information is captured in immutable tenant audit logs?",
        "grounding_context": "Audit logs record actor ID, role, action, target resource, IP address, timestamp, severity, and structured metadata. Audit entries are immutable and written synchronously to database storage.",
        "expected_answer": "Audit logs record actor ID, role, action, target resource, IP address, timestamp, severity, and structured metadata synchronously to database storage.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    },
    {
        "id": "rag_18_razorpay_webhook_verification",
        "category": "Billing",
        "query": "How does the payment service verify Razorpay webhook callbacks?",
        "grounding_context": "Razorpay webhooks verify the X-Razorpay-Signature header by computing an HMAC-SHA256 signature across the raw request body using the configured webhook secret.",
        "expected_answer": "Razorpay webhooks verify the X-Razorpay-Signature header by computing an HMAC-SHA256 signature across the raw request body using the configured webhook secret.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    },
    {
        "id": "rag_19_semantic_reranking",
        "category": "RAG",
        "query": "Why is semantic reranking used during knowledge chunk retrieval?",
        "grounding_context": "Semantic reranking scores retrieved chunks against the user query to reorder top candidates by contextual relevance, minimizing noise and reducing LLM hallucination risk.",
        "expected_answer": "Semantic reranking scores retrieved chunks against the user query to reorder top candidates by contextual relevance, minimizing noise and reducing LLM hallucination risk.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    },
    {
        "id": "rag_20_agent_versioning_and_rollback",
        "category": "Agent",
        "query": "How do draft versions and production agent rollbacks operate?",
        "grounding_context": "Agents maintain draft and published versions with incremented version numbers. Publishing updates the active pointer, while rolling back reactivates a previous immutable version configuration.",
        "expected_answer": "Agents maintain draft and published versions with incremented version numbers; publishing updates the active pointer while rolling back reactivates a previous immutable version configuration.",
        "min_faithfulness": 0.80,
        "min_recall": 0.80
    }
]
