"""
SQLAlchemy 2.0 Declarative Models for PostgreSQL + pgvector
Complete multi-tenant entity schema for Chat-AaaS Enterprise Platform
"""

import time
from typing import Optional, List
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    Float,
    DateTime,
    Text,
    JSON,
    ForeignKey,
    Index
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Company(Base):
    __tablename__ = "companies"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    domain = Column(String(255), nullable=True)
    industry = Column(String(100), nullable=True)
    plan_id = Column(String(50), default="starter", nullable=False)
    billing_cycle = Column(String(20), default="monthly", nullable=False)
    plan_status = Column(String(50), default="active", nullable=False)
    is_suspended = Column(Boolean, default=False, nullable=False)
    api_key = Column(String(255), nullable=True)
    api_secret_encrypted = Column(Text, nullable=True)
    settings = Column(JSON, default=dict, nullable=False)
    created_at = Column(String(64), nullable=False)
    updated_at = Column(String(64), nullable=True)

    # Relationships
    users = relationship("Membership", back_populates="company", cascade="all, delete-orphan")
    agents = relationship("Agent", back_populates="company", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="company", cascade="all, delete-orphan")
    knowledge_sources = relationship("KnowledgeSource", back_populates="company", cascade="all, delete-orphan")
    tools = relationship("AgentTool", back_populates="company", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    is_email_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(String(64), nullable=False)
    updated_at = Column(String(64), nullable=True)

    memberships = relationship("Membership", back_populates="user", cascade="all, delete-orphan")


class Membership(Base):
    __tablename__ = "memberships"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(String(64), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), default="viewer", nullable=False)  # super_admin, owner, admin, support_lead, agent_editor, viewer
    status = Column(String(50), default="active", nullable=False)
    created_at = Column(String(64), nullable=False)

    user = relationship("User", back_populates="memberships")
    company = relationship("Company", back_populates="users")

    __table_args__ = (
        Index("idx_user_company", "user_id", "company_id", unique=True),
    )


class Agent(Base):
    __tablename__ = "agents"

    id = Column(String(64), primary_key=True, index=True)
    company_id = Column(String(64), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    status = Column(String(50), default="active", nullable=False)  # active, paused, training
    tone = Column(String(50), default="professional", nullable=False)
    active_version_id = Column(String(64), nullable=True)
    draft_version_id = Column(String(64), nullable=True)
    created_at = Column(String(64), nullable=False)
    updated_at = Column(String(64), nullable=True)

    company = relationship("Company", back_populates="agents")
    versions = relationship("AgentVersion", back_populates="agent", cascade="all, delete-orphan")


class AgentVersion(Base):
    __tablename__ = "agent_versions"

    id = Column(String(64), primary_key=True, index=True)
    agent_id = Column(String(64), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(String(64), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    status = Column(String(50), default="draft", nullable=False)  # draft, published, archived
    system_instructions = Column(Text, nullable=True)
    greeting_message = Column(Text, nullable=True)
    fallback_message = Column(Text, nullable=True)
    tone = Column(String(50), default="professional", nullable=False)
    model = Column(String(100), default="gpt-4o", nullable=False)
    temperature = Column(Float, default=0.2, nullable=False)
    allowed_action_ids = Column(JSON, default=list, nullable=False)
    escalation_settings = Column(JSON, default=dict, nullable=False)
    custom_safety_rules = Column(JSON, default=list, nullable=False)
    change_summary = Column(Text, nullable=True)
    published_by_user_id = Column(String(64), nullable=True)
    published_at = Column(String(64), nullable=True)
    created_at = Column(String(64), nullable=False)

    agent = relationship("Agent", back_populates="versions")

    __table_args__ = (
        Index("idx_agent_version_num", "agent_id", "version_number"),
    )


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(64), primary_key=True, index=True)
    company_id = Column(String(64), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_session_id = Column(String(255), nullable=True, index=True)
    customer_name = Column(String(255), default="Website Visitor", nullable=False)
    customer_email = Column(String(255), nullable=True)
    channel = Column(String(50), default="website_widget", nullable=False)
    status = Column(String(50), default="active", nullable=False)  # active, waiting_on_customer, human_takeover, resolved
    sentiment = Column(String(50), default="neutral", nullable=False)
    assigned_human_id = Column(String(64), nullable=True)
    internal_notes = Column(Text, nullable=True)
    tags = Column(JSON, default=list, nullable=False)
    total_tokens_used = Column(Integer, default=0, nullable=False)
    started_at = Column(String(64), nullable=False)
    last_message_at = Column(String(64), nullable=False)

    company = relationship("Company", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(64), primary_key=True, index=True)
    conversation_id = Column(String(64), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(String(64), nullable=False, index=True)
    sender_type = Column(String(50), nullable=False)  # user, agent, human_agent, system
    sender_id = Column(String(64), nullable=True)
    sender_name = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    citations = Column(JSON, default=list, nullable=False)
    tool_traces = Column(JSON, default=list, nullable=False)
    tokens_consumed = Column(Integer, default=0, nullable=False)
    created_at = Column(String(64), nullable=False)

    conversation = relationship("Conversation", back_populates="messages")


class KnowledgeSource(Base):
    __tablename__ = "knowledge_sources"

    id = Column(String(64), primary_key=True, index=True)
    company_id = Column(String(64), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    source_type = Column(String(50), nullable=False)  # url, pdf, docx, txt, manual
    source_url = Column(String(1000), nullable=True)
    category = Column(String(100), default="General", nullable=False)
    status = Column(String(50), default="indexed", nullable=False)  # processing, indexed, error
    chunk_count = Column(Integer, default=0, nullable=False)
    total_tokens = Column(Integer, default=0, nullable=False)
    created_at = Column(String(64), nullable=False)
    updated_at = Column(String(64), nullable=True)

    company = relationship("Company", back_populates="knowledge_sources")
    chunks = relationship("DocumentChunk", back_populates="source", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(64), primary_key=True, index=True)
    knowledge_source_id = Column(String(64), ForeignKey("knowledge_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(String(64), nullable=False, index=True)
    chunk_index = Column(Integer, default=0, nullable=False)
    content = Column(Text, nullable=False)
    token_count = Column(Integer, default=0, nullable=False)
    embedding = Column(JSON, nullable=True)  # Stored as array/vector for pgvector similarity
    metadata_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(String(64), nullable=False)

    source = relationship("KnowledgeSource", back_populates="chunks")

    __table_args__ = (
        Index("idx_tenant_chunk", "company_id", "knowledge_source_id"),
    )


class AgentTool(Base):
    __tablename__ = "agent_tools"

    id = Column(String(64), primary_key=True, index=True)
    company_id = Column(String(64), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    risk_level = Column(String(50), default="read_only", nullable=False)  # read_only, low_risk, high_risk
    requires_user_confirmation = Column(Boolean, default=False, nullable=False)
    confirmation_prompt = Column(Text, nullable=True)
    enabled = Column(Boolean, default=True, nullable=False)
    parameters = Column(JSON, default=list, nullable=False)
    endpoint_config = Column(JSON, default=dict, nullable=False)
    created_at = Column(String(64), nullable=False)

    company = relationship("Company", back_populates="tools")

    __table_args__ = (
        Index("idx_tenant_tool_code", "company_id", "code", unique=True),
    )


class Integration(Base):
    __tablename__ = "integrations"

    id = Column(String(64), primary_key=True, index=True)
    company_id = Column(String(64), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(100), nullable=False)  # slack, whatsapp, hubspot, salesforce, webhook
    name = Column(String(255), nullable=False)
    status = Column(String(50), default="disconnected", nullable=False)  # connected, disconnected, error
    encrypted_credentials = Column(Text, nullable=True)
    config = Column(JSON, default=dict, nullable=False)
    connected_at = Column(String(64), nullable=True)
    created_at = Column(String(64), nullable=False)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String(64), primary_key=True, index=True)
    company_id = Column(String(64), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(String(50), nullable=False)
    billing_cycle = Column(String(20), default="monthly", nullable=False)
    status = Column(String(50), default="active", nullable=False)
    current_period_start = Column(String(64), nullable=False)
    current_period_end = Column(String(64), nullable=False)
    cancel_at_period_end = Column(Boolean, default=False, nullable=False)
    created_at = Column(String(64), nullable=False)


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(64), primary_key=True, index=True)
    company_id = Column(String(64), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_number = Column(String(100), unique=True, index=True, nullable=False)
    date = Column(String(64), nullable=False)
    plan_name = Column(String(255), nullable=False)
    subtotal_inr = Column(Float, nullable=False)
    tax_rate_percent = Column(Float, default=18.0, nullable=False)
    tax_amount_inr = Column(Float, nullable=False)
    total_amount_inr = Column(Float, nullable=False)
    tax_breakdown = Column(JSON, default=dict, nullable=False)  # cgst, sgst, igst
    status = Column(String(50), default="paid", nullable=False)
    pdf_url = Column(String(500), nullable=True)
    created_at = Column(String(64), nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(64), primary_key=True, index=True)
    company_id = Column(String(64), nullable=False, index=True)
    actor_id = Column(String(64), nullable=False)
    actor_role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)  # agent.publish, tool.execute, plan.upgrade, etc.
    target_resource = Column(String(100), nullable=False)
    target_id = Column(String(64), nullable=True)
    ip_address = Column(String(100), nullable=True)
    metadata_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(String(64), nullable=False)


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(String(64), primary_key=True, index=True)
    company_id = Column(String(64), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    key_prefix = Column(String(32), nullable=False)
    key_hash = Column(String(255), nullable=False)
    secret_masked = Column(String(64), nullable=False)
    scopes = Column(JSON, default=list, nullable=False)
    expires_at = Column(String(64), nullable=True)
    created_at = Column(String(64), nullable=False)


class Webhook(Base):
    __tablename__ = "webhooks"

    id = Column(String(64), primary_key=True, index=True)
    company_id = Column(String(64), nullable=False, index=True)
    target_url = Column(String(1000), nullable=False)
    events = Column(JSON, default=list, nullable=False)
    description = Column(String(255), nullable=True)
    secret = Column(String(255), nullable=True)
    status = Column(String(50), default="active", nullable=False)
    created_at = Column(String(64), nullable=False)
