"""initial_baseline_24_models

Revision ID: 0001_baseline
Revises: 
Create Date: 2026-09-16 19:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001_baseline'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Companies
    op.create_table(
        'companies',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('domain', sa.String(length=255), nullable=True),
        sa.Column('industry', sa.String(length=100), nullable=True),
        sa.Column('plan_id', sa.String(length=50), nullable=False, server_default='starter'),
        sa.Column('billing_cycle', sa.String(length=20), nullable=False, server_default='monthly'),
        sa.Column('plan_status', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('is_suspended', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('api_key', sa.String(length=255), nullable=True),
        sa.Column('api_secret_encrypted', sa.Text(), nullable=True),
        sa.Column('settings', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.Column('updated_at', sa.String(length=64), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_companies_id', 'companies', ['id'], unique=False)
    op.create_index('ix_companies_slug', 'companies', ['slug'], unique=True)

    # 2. Users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('is_email_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_suspended', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.Column('updated_at', sa.String(length=64), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_id', 'users', ['id'], unique=False)
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # 3. Memberships
    op.create_table(
        'memberships',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='viewer'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_memberships_id', 'memberships', ['id'], unique=False)
    op.create_index('ix_memberships_user_id', 'memberships', ['user_id'], unique=False)
    op.create_index('ix_memberships_company_id', 'memberships', ['company_id'], unique=False)
    op.create_index('idx_user_company', 'memberships', ['user_id', 'company_id'], unique=True)

    # 4. Agents
    op.create_table(
        'agents',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('lifecycle_status', sa.String(length=50), nullable=False, server_default='published'),
        sa.Column('published_version_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('draft_version_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('last_published_at', sa.String(length=64), nullable=True),
        sa.Column('tone', sa.String(length=50), nullable=False, server_default='professional'),
        sa.Column('active_version_id', sa.String(length=64), nullable=True),
        sa.Column('draft_version_id', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.Column('updated_at', sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_agents_id', 'agents', ['id'], unique=False)
    op.create_index('ix_agents_company_id', 'agents', ['company_id'], unique=True)

    # 5. Agent Versions
    op.create_table(
        'agent_versions',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('agent_id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='draft'),
        sa.Column('system_instructions', sa.Text(), nullable=True),
        sa.Column('greeting_message', sa.Text(), nullable=True),
        sa.Column('fallback_message', sa.Text(), nullable=True),
        sa.Column('tone', sa.String(length=50), nullable=False, server_default='professional'),
        sa.Column('model', sa.String(length=100), nullable=False, server_default='gpt-4o'),
        sa.Column('temperature', sa.Float(), nullable=False, server_default='0.2'),
        sa.Column('allowed_action_ids', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('escalation_settings', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('custom_safety_rules', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('change_summary', sa.Text(), nullable=True),
        sa.Column('published_by_user_id', sa.String(length=64), nullable=True),
        sa.Column('published_at', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_agent_versions_id', 'agent_versions', ['id'], unique=False)
    op.create_index('ix_agent_versions_agent_id', 'agent_versions', ['agent_id'], unique=False)
    op.create_index('ix_agent_versions_company_id', 'agent_versions', ['company_id'], unique=False)
    op.create_index('idx_agent_version_num', 'agent_versions', ['agent_id', 'version_number'], unique=False)

    # 6. Conversations
    op.create_table(
        'conversations',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('customer_session_id', sa.String(length=255), nullable=True),
        sa.Column('customer_name', sa.String(length=255), nullable=False, server_default='Website Visitor'),
        sa.Column('customer_email', sa.String(length=255), nullable=True),
        sa.Column('channel', sa.String(length=50), nullable=False, server_default='website_widget'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('sentiment', sa.String(length=50), nullable=False, server_default='neutral'),
        sa.Column('assigned_human_id', sa.String(length=64), nullable=True),
        sa.Column('internal_notes', sa.Text(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('total_tokens_used', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('started_at', sa.String(length=64), nullable=False),
        sa.Column('last_message_at', sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_conversations_id', 'conversations', ['id'], unique=False)
    op.create_index('ix_conversations_company_id', 'conversations', ['company_id'], unique=False)
    op.create_index('ix_conversations_customer_session_id', 'conversations', ['customer_session_id'], unique=False)

    # 7. Messages
    op.create_table(
        'messages',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('conversation_id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('sender_type', sa.String(length=50), nullable=False),
        sa.Column('sender_id', sa.String(length=64), nullable=True),
        sa.Column('sender_name', sa.String(length=255), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('citations', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('tool_traces', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('tokens_consumed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_messages_id', 'messages', ['id'], unique=False)
    op.create_index('ix_messages_conversation_id', 'messages', ['conversation_id'], unique=False)
    op.create_index('ix_messages_company_id', 'messages', ['company_id'], unique=False)

    # 8. Knowledge Collections
    op.create_table(
        'knowledge_collections',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon', sa.String(length=50), nullable=False, server_default='folder'),
        sa.Column('color', sa.String(length=50), nullable=False, server_default='indigo'),
        sa.Column('source_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.Column('updated_at', sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_knowledge_collections_id', 'knowledge_collections', ['id'], unique=False)
    op.create_index('ix_knowledge_collections_company_id', 'knowledge_collections', ['company_id'], unique=False)
    op.create_index('idx_tenant_collection_name', 'knowledge_collections', ['company_id', 'name'], unique=True)

    # 9. Knowledge Sources
    op.create_table(
        'knowledge_sources',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('collection_id', sa.String(length=64), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('mime_type', sa.String(length=100), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('source_url', sa.String(length=1000), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=False, server_default='General'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='ready'),
        sa.Column('lifecycle_state', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('processing_stage', sa.String(length=50), nullable=False, server_default='indexed'),
        sa.Column('deleted_at', sa.String(length=64), nullable=True),
        sa.Column('retention_days', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('last_indexed_at', sa.String(length=64), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('chunk_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_synced_at', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.Column('updated_at', sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(['collection_id'], ['knowledge_collections.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_knowledge_sources_id', 'knowledge_sources', ['id'], unique=False)
    op.create_index('ix_knowledge_sources_company_id', 'knowledge_sources', ['company_id'], unique=False)
    op.create_index('ix_knowledge_sources_collection_id', 'knowledge_sources', ['collection_id'], unique=False)

    # 10. Document Chunks
    op.create_table(
        'document_chunks',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('knowledge_source_id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('collection_id', sa.String(length=64), nullable=True),
        sa.Column('chunk_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('token_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('section_header', sa.String(length=255), nullable=True),
        sa.Column('embedding', sa.JSON(), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(['knowledge_source_id'], ['knowledge_sources.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_document_chunks_id', 'document_chunks', ['id'], unique=False)
    op.create_index('ix_document_chunks_knowledge_source_id', 'document_chunks', ['knowledge_source_id'], unique=False)
    op.create_index('ix_document_chunks_company_id', 'document_chunks', ['company_id'], unique=False)
    op.create_index('ix_document_chunks_collection_id', 'document_chunks', ['collection_id'], unique=False)
    op.create_index('idx_tenant_chunk', 'document_chunks', ['company_id', 'knowledge_source_id'], unique=False)

    # 11. Knowledge Gaps
    op.create_table(
        'knowledge_gaps',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('query', sa.String(length=500), nullable=False),
        sa.Column('occurrences', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('last_asked_at', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='unresolved'),
        sa.Column('suggested_category', sa.String(length=100), nullable=False, server_default='General'),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_knowledge_gaps_id', 'knowledge_gaps', ['id'], unique=False)
    op.create_index('ix_knowledge_gaps_company_id', 'knowledge_gaps', ['company_id'], unique=False)

    # 12. Knowledge Feedback
    op.create_table(
        'knowledge_feedback',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('conversation_id', sa.String(length=64), nullable=True),
        sa.Column('message_id', sa.String(length=64), nullable=True),
        sa.Column('rating', sa.String(length=20), nullable=False),
        sa.Column('feedback_text', sa.Text(), nullable=True),
        sa.Column('retrieved_chunk_ids', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_knowledge_feedback_id', 'knowledge_feedback', ['id'], unique=False)
    op.create_index('ix_knowledge_feedback_company_id', 'knowledge_feedback', ['company_id'], unique=False)
    op.create_index('ix_knowledge_feedback_conversation_id', 'knowledge_feedback', ['conversation_id'], unique=False)
    op.create_index('ix_knowledge_feedback_message_id', 'knowledge_feedback', ['message_id'], unique=False)

    # 13. Knowledge Jobs
    op.create_table(
        'knowledge_jobs',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('source_id', sa.String(length=64), nullable=False),
        sa.Column('job_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='queued'),
        sa.Column('progress_percent', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_details', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.Column('completed_at', sa.String(length=64), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_knowledge_jobs_id', 'knowledge_jobs', ['id'], unique=False)
    op.create_index('ix_knowledge_jobs_company_id', 'knowledge_jobs', ['company_id'], unique=False)
    op.create_index('ix_knowledge_jobs_source_id', 'knowledge_jobs', ['source_id'], unique=False)

    # 14. Agent Tools
    op.create_table(
        'agent_tools',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('code', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('risk_level', sa.String(length=50), nullable=False, server_default='read_only'),
        sa.Column('requires_user_confirmation', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('confirmation_prompt', sa.Text(), nullable=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('parameters', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('endpoint_config', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_agent_tools_id', 'agent_tools', ['id'], unique=False)
    op.create_index('ix_agent_tools_company_id', 'agent_tools', ['company_id'], unique=False)
    op.create_index('idx_tenant_tool_code', 'agent_tools', ['company_id', 'code'], unique=True)

    # 15. Integrations
    op.create_table(
        'integrations',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('provider', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='disconnected'),
        sa.Column('encrypted_credentials', sa.Text(), nullable=True),
        sa.Column('config', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('connected_at', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_integrations_id', 'integrations', ['id'], unique=False)
    op.create_index('ix_integrations_company_id', 'integrations', ['company_id'], unique=False)

    # 16. Subscriptions
    op.create_table(
        'subscriptions',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('plan_id', sa.String(length=50), nullable=False),
        sa.Column('billing_cycle', sa.String(length=20), nullable=False, server_default='monthly'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('current_period_start', sa.String(length=64), nullable=False),
        sa.Column('current_period_end', sa.String(length=64), nullable=False),
        sa.Column('cancel_at_period_end', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_subscriptions_id', 'subscriptions', ['id'], unique=False)
    op.create_index('ix_subscriptions_company_id', 'subscriptions', ['company_id'], unique=False)

    # 17. Invoices
    op.create_table(
        'invoices',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('invoice_number', sa.String(length=100), nullable=False),
        sa.Column('date', sa.String(length=64), nullable=False),
        sa.Column('plan_name', sa.String(length=255), nullable=False),
        sa.Column('subtotal_inr', sa.Float(), nullable=False),
        sa.Column('tax_rate_percent', sa.Float(), nullable=False, server_default='18.0'),
        sa.Column('tax_amount_inr', sa.Float(), nullable=False),
        sa.Column('total_amount_inr', sa.Float(), nullable=False),
        sa.Column('tax_breakdown', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='paid'),
        sa.Column('pdf_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_invoices_id', 'invoices', ['id'], unique=False)
    op.create_index('ix_invoices_company_id', 'invoices', ['company_id'], unique=False)
    op.create_index('ix_invoices_invoice_number', 'invoices', ['invoice_number'], unique=True)

    # 18. Audit Logs
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('actor_id', sa.String(length=64), nullable=False),
        sa.Column('actor_role', sa.String(length=50), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('target_resource', sa.String(length=100), nullable=False),
        sa.Column('target_id', sa.String(length=64), nullable=True),
        sa.Column('ip_address', sa.String(length=100), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_audit_logs_id', 'audit_logs', ['id'], unique=False)
    op.create_index('ix_audit_logs_company_id', 'audit_logs', ['company_id'], unique=False)

    # 19. Deployments
    op.create_table(
        'deployments',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('channel', sa.String(length=50), nullable=False, server_default='website_widget'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('assistant_version', sa.String(length=50), nullable=False, server_default='v1'),
        sa.Column('domain', sa.String(length=255), nullable=True),
        sa.Column('config', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('last_active_at', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.Column('updated_at', sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_deployments_id', 'deployments', ['id'], unique=False)
    op.create_index('ix_deployments_company_id', 'deployments', ['company_id'], unique=False)

    # 20. API Keys
    op.create_table(
        'api_keys',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('key_prefix', sa.String(length=32), nullable=False),
        sa.Column('key_hash', sa.String(length=255), nullable=False),
        sa.Column('secret_masked', sa.String(length=64), nullable=False),
        sa.Column('scopes', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('last_used_at', sa.String(length=64), nullable=True),
        sa.Column('expires_at', sa.String(length=64), nullable=True),
        sa.Column('revoked_at', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_api_keys_id', 'api_keys', ['id'], unique=False)
    op.create_index('ix_api_keys_company_id', 'api_keys', ['company_id'], unique=False)

    # 21. Webhooks
    op.create_table(
        'webhooks',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('target_url', sa.String(length=1000), nullable=False),
        sa.Column('events', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('secret', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('last_delivery_status', sa.String(length=50), nullable=True),
        sa.Column('response_time_ms', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_delivered_at', sa.String(length=64), nullable=True),
        sa.Column('failure_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('delivery_history', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_webhooks_id', 'webhooks', ['id'], unique=False)
    op.create_index('ix_webhooks_company_id', 'webhooks', ['company_id'], unique=False)

    # 22. Action Executions
    op.create_table(
        'action_executions',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('tool_code', sa.String(length=100), nullable=False),
        sa.Column('idempotency_key', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='created'),
        sa.Column('risk_level', sa.String(length=50), nullable=False, server_default='low_risk'),
        sa.Column('requires_user_confirmation', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_confirmed', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('parameters', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('result', sa.JSON(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.Column('updated_at', sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_action_executions_id', 'action_executions', ['id'], unique=False)
    op.create_index('ix_action_executions_company_id', 'action_executions', ['company_id'], unique=False)
    op.create_index('ix_action_executions_idempotency_key', 'action_executions', ['idempotency_key'], unique=False)
    op.create_index('idx_tenant_idempotency', 'action_executions', ['company_id', 'idempotency_key'], unique=False)

    # 23. Background Jobs
    op.create_table(
        'background_jobs',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('queue_name', sa.String(length=64), nullable=False, server_default='default'),
        sa.Column('job_type', sa.String(length=64), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='queued'),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_attempts', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('result', sa.JSON(), nullable=True),
        sa.Column('locked_by', sa.String(length=64), nullable=True),
        sa.Column('locked_at', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.String(length=64), nullable=False),
        sa.Column('updated_at', sa.String(length=64), nullable=True),
        sa.Column('completed_at', sa.String(length=64), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_background_jobs_id', 'background_jobs', ['id'], unique=False)
    op.create_index('ix_background_jobs_company_id', 'background_jobs', ['company_id'], unique=False)
    op.create_index('ix_background_jobs_queue_name', 'background_jobs', ['queue_name'], unique=False)
    op.create_index('ix_background_jobs_job_type', 'background_jobs', ['job_type'], unique=False)
    op.create_index('ix_background_jobs_status', 'background_jobs', ['status'], unique=False)
    op.create_index('idx_job_queue_status', 'background_jobs', ['queue_name', 'status'], unique=False)
    op.create_index('idx_job_tenant', 'background_jobs', ['company_id', 'status'], unique=False)

    # 24. Handoff Sessions
    op.create_table(
        'handoff_sessions',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('company_id', sa.String(length=64), nullable=False),
        sa.Column('conversation_id', sa.String(length=64), nullable=False),
        sa.Column('operator_id', sa.String(length=64), nullable=True),
        sa.Column('operator_name', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='requested'),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('requested_at', sa.String(length=64), nullable=False),
        sa.Column('assigned_at', sa.String(length=64), nullable=True),
        sa.Column('resolved_at', sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_handoff_sessions_id', 'handoff_sessions', ['id'], unique=False)
    op.create_index('ix_handoff_sessions_company_id', 'handoff_sessions', ['company_id'], unique=False)
    op.create_index('ix_handoff_sessions_conversation_id', 'handoff_sessions', ['conversation_id'], unique=False)
    op.create_index('idx_handoff_tenant_conv', 'handoff_sessions', ['company_id', 'conversation_id'], unique=False)


def downgrade() -> None:
    op.drop_table('handoff_sessions')
    op.drop_table('background_jobs')
    op.drop_table('action_executions')
    op.drop_table('webhooks')
    op.drop_table('api_keys')
    op.drop_table('deployments')
    op.drop_table('audit_logs')
    op.drop_table('invoices')
    op.drop_table('subscriptions')
    op.drop_table('integrations')
    op.drop_table('agent_tools')
    op.drop_table('knowledge_jobs')
    op.drop_table('knowledge_feedback')
    op.drop_table('knowledge_gaps')
    op.drop_table('document_chunks')
    op.drop_table('knowledge_sources')
    op.drop_table('knowledge_collections')
    op.drop_table('messages')
    op.drop_table('conversations')
    op.drop_table('agent_versions')
    op.drop_table('agents')
    op.drop_table('memberships')
    op.drop_table('users')
    op.drop_table('companies')
