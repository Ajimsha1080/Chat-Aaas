"""add_tenant_key_metadata

Revision ID: 0003_envelope_keys
Revises: 0002_rls
Create Date: 2026-09-17 17:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0003_envelope_keys'
down_revision: Union[str, Sequence[str], None] = '0002_rls'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'tenant_key_metadata',
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('wrapped_dek', sa.Text(), nullable=False),
        sa.Column('nonce', sa.String(length=64), nullable=False),
        sa.Column('algorithm', sa.String(length=50), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.Column('rotated_at', sa.String(length=64), nullable=True),
        sa.PrimaryKeyConstraint('company_id')
    )
    op.create_index(op.f('ix_tenant_key_metadata_company_id'), 'tenant_key_metadata', ['company_id'], unique=False)

    conn = op.get_bind()
    if conn.dialect.name == 'postgresql':
        op.execute("ALTER TABLE tenant_key_metadata ENABLE ROW LEVEL SECURITY;")
        op.execute("ALTER TABLE tenant_key_metadata FORCE ROW LEVEL SECURITY;")
        op.execute("""
            CREATE POLICY tenant_key_metadata_isolation_policy ON tenant_key_metadata
            FOR ALL
            USING (
                company_id = NULLIF(current_setting('app.current_tenant_id', true), '')
                OR NULLIF(current_setting('app.is_super_admin', true), '') = 'true'
            );
        """)


def downgrade() -> None:
    op.drop_index(op.f('ix_tenant_key_metadata_company_id'), table_name='tenant_key_metadata')
    op.drop_table('tenant_key_metadata')
