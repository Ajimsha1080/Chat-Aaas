# Security & Multi-Tenancy Isolation Model

## 1. Strict Tenant Isolation
Every database entity (Conversations, Messages, Documents, Chunks, Tools, Usage Logs) contains an immutable `companyId`.
- Query Scoping: All database adapters enforce `WHERE company_id = ?` at the lowest repository layer.
- Cross-Tenant Prevention: Cross-company queries immediately return empty results or throw unauthorized exceptions.

---

## 2. Server-Side Request Forgery (SSRF) Defense
Knowledge base web crawlers validate all target URLs against SSRF patterns before making network requests:
- Disallows `localhost`, `127.0.0.1`, `0.0.0.0`, and private RFC1918 subnets.
- Blocks AWS/GCP/Azure link-local metadata endpoints (`169.254.169.254`).
- Enforces valid `http://` or `https://` schemes.

---

## 3. High-Risk Action Confirmation Gate
Tools are classified into three risk tiers:
1. `read_only`: Executed automatically (e.g., `check_order_status`, `query_sla_metrics`).
2. `low_risk`: Executed with audit logging (e.g., `update_ticket_notes`).
3. `high_risk`: Requires explicit end-user or agent confirmation before execution (e.g., `execute_refund`, `restart_cluster_nodes`).

---

## 4. Role-Based Access Control (RBAC)
Supported organization roles:
- Owner: Full billing, API key generation, agent deletion, and user management.
- Admin: Agent configuration, knowledge ingestion, tool management, and team invites.
- Staff: Inbox live agent support, customer chatting, manual handoff takeover.
- Developer: API keys, webhooks, and tool function code editor.
- Viewer: Read-only analytics, conversations, and agent preview.
