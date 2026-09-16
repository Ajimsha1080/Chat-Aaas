# Database Migration Safety Policy & Standard Operating Procedure

CoarAI multi-tenant PostgreSQL follows a zero-downtime, non-destructive migration lifecycle.

---

## 1. The Three-Phase Rule: Expand → Backfill → Contract

Every schema modification must be split across releases to ensure backward compatibility and zero downtime during rolling container updates:

### Phase 1: Expand (Add without breaking)
* Add new columns as `NULLABLE` or with safe server defaults.
* Add new tables and additive indexes.
* Application code writes to both old and new schema where necessary.
* Old application versions can still run uninterrupted.

### Phase 2: Backfill (Async data migration)
* Execute an asynchronous background script or worker job to populate new columns for existing records.
* Verify data parity and consistency across all tenants.

### Phase 3: Contract (Remove deprecated structures)
* Once all running instances use the new column, add `NOT NULL` constraints if required.
* Safely drop deprecated columns or tables in a subsequent release.
* **Never drop or rename a column in the same deployment that introduces the code change.**

---

## 2. Deploying Migrations

In production, migrations are executed explicitly before launching application containers:

```bash
# Production migration execution
python -m alembic upgrade head
```

---

## 3. Prohibited Operations in Migration Files
* `DROP COLUMN` without a prior release deprecating its usage.
* Long-running table locks on high-traffic tables (`messages`, `conversations`, `document_chunks`).
* Mixing schema DDL with large synchronous DML data migrations.
