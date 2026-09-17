"""enable_postgresql_rls

Revision ID: 0002_rls
Revises: 0001_baseline
Create Date: 2026-09-16 20:10:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '0002_rls'
down_revision: Union[str, None] = '0001_baseline'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TENANT_TABLES = [
    'memberships',
    'agents',
    'agent_versions',
    'conversations',
    'messages',
    'knowledge_collections',
    'knowledge_sources',
    'document_chunks',
    'knowledge_gaps',
    'knowledge_feedback',
    'knowledge_jobs',
    'agent_tools',
    'integrations',
    'subscriptions',
    'invoices',
    'audit_logs',
    'deployments',
    'api_keys',
    'webhooks',
    'action_executions',
    'background_jobs',
    'handoff_sessions',
]

def upgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name == 'postgresql':
        # 1. Enable RLS on Companies (matches id)
        op.execute("ALTER TABLE companies ENABLE ROW LEVEL SECURITY;")
        op.execute("ALTER TABLE companies FORCE ROW LEVEL SECURITY;")
        op.execute("""
            CREATE POLICY companies_tenant_isolation_policy ON companies
            FOR ALL
            USING (
                id = NULLIF(current_setting('app.current_tenant_id', true), '')
                OR NULLIF(current_setting('app.is_super_admin', true), '') = 'true'
            );
        """)

        # 2. Enable RLS on all tenant-owned tables (matches company_id)
        for table in TENANT_TABLES:
            op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
            op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;")
            op.execute(f"""
                CREATE POLICY {table}_tenant_isolation_policy ON {table}
                FOR ALL
                USING (
                    company_id = NULLIF(current_setting('app.current_tenant_id', true), '')
                    OR NULLIF(current_setting('app.is_super_admin', true), '') = 'true'
                );
            """)

def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name == 'postgresql':
        op.execute("DROP POLICY IF EXISTS companies_tenant_isolation_policy ON companies;")
        op.execute("ALTER TABLE companies DISABLE ROW LEVEL SECURITY;")

        for table in TENANT_TABLES:
            op.execute(f"DROP POLICY IF EXISTS {table}_tenant_isolation_policy ON {table};")
            op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")
