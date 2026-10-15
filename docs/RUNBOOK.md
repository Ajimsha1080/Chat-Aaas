# CoarAI Production Operations Runbook

## Overview
This runbook covers day-to-day operations, incident response, disaster recovery, secret rotation, and deployment maintenance for the CoarAI Multi-Tenant Enterprise AI Platform.

---

## 1. High Availability Architecture & Components
- **API Cluster**: FastAPI instances running behind Nginx with TLS termination, HSTS, strict CSP headers.
- **Worker Cluster**: Asynchronous background Celery/Redis workers executing document parsing, chunking, and vector indexing.
- **Data Tier**:
  - PostgreSQL 16 + pgvector extension with Row-Level Security (RLS) policies enforcing multi-tenant isolation.
  - Redis 7 for distributed rate limiting, webhook idempotency, and session revocation caches.
  - AWS S3 / Cloudflare R2 for tenant-isolated document storage (`{tenant_id}/{document_id}/{filename}`).
- **Observability**: Prometheus APM scraping `/metrics` (internal bearer token required), structured JSON access logging, Sentry error tracking.

---

## 2. Emergency Incident Response: Global AI Killswitch
In the event of an active prompt injection attack, provider outage, or critical security compromise:

### Activating the Global AI Killswitch
```bash
curl -X POST https://api.coarai.com/api/v1/admin/killswitch \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"action": "activate", "reason": "Emergency vendor degradation / security patch"}'
```
All subsequent `/api/v1/chat` and public visitor widget requests will immediately fail gracefully with `HTTP 503 Service Unavailable`.

### Deactivating the Global AI Killswitch
```bash
curl -X POST https://api.coarai.com/api/v1/admin/killswitch \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"action": "deactivate"}'
```

---

## 3. Database Migrations
Migrations run as an isolated, single-execution container job before replicas start:

```bash
# Execute latest schema migrations
docker compose run --rm migration alembic upgrade head

# Verify models and migrations are 100% in sync
docker compose run --rm migration alembic check
```

---

## 4. Disaster Recovery & Tenant Backup / Restore
Point-in-time encrypted snapshots are created automatically every 24 hours.

### Manual Tenant Point-in-Time Backup
```bash
curl -X POST https://api.coarai.com/api/v1/companies/<COMPANY_ID>/backup/export \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>"
```

### Restoring Tenant State from Snapshot
```bash
curl -X POST https://api.coarai.com/api/v1/companies/<COMPANY_ID>/backup/restore \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"snapshotJsonGzBase64": "<BASE64_GZ_PAYLOAD>"}'
```

---

## 5. Security Token & Secret Rotation Procedure
1. **JWT Secret (`JWT_SECRET`)**: Rotate secret in environment secrets manager. All existing sessions are immediately invalidated on next token decode.
2. **Internal Secret (`PYTHON_AI_INTERNAL_SECRET`)**: Rotate secret synchronously across API and worker clusters.
3. **Database DEK / KEK Rotation**:
   Tenant Data Encryption Keys (DEKs) are wrapped with platform Key Encryption Key (KEK). Rotate platform envelope key via `/api/v1/admin/security/rotate-kek`.

---

## 6. GDPR Compliance Execution
- **Article 20 (Data Export)**:
  `GET /api/v1/companies/<COMPANY_ID>/gdpr/export`
- **Article 17 (Right to Erasure / Purge)**:
  `DELETE /api/v1/companies/<COMPANY_ID>/gdpr/delete`
