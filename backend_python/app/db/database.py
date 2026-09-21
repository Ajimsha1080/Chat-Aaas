import os
import json
import time
import logging
from typing import Dict, Any, List, Optional
from contextlib import contextmanager
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.security import hash_password, verify_password
from app.core.config import settings
from app.db.models import (
    Base, Conversation, Message, Company, User, Membership, Agent, AgentVersion,
    KnowledgeSource, DocumentChunk,
    AgentTool,
    Integration, Subscription, Invoice, AuditLog, Webhook, ActionExecution, TenantKeyMetadata
)

logger = logging.getLogger(__name__)

class DatabaseStore:
    def __init__(self):
        self.users: Dict[str, Dict[str, Any]] = {}
        self.companies: Dict[str, Dict[str, Any]] = {}
        self.memberships: Dict[str, Dict[str, Any]] = {}
        self.agents: Dict[str, Dict[str, Any]] = {}
        self.agent_versions: Dict[str, Dict[str, Any]] = {}
        self.knowledge_collections: Dict[str, Dict[str, Any]] = {}
        self.knowledge_sources: Dict[str, Dict[str, Any]] = {}
        self.document_chunks: Dict[str, Dict[str, Any]] = {}
        self.knowledge_gaps: Dict[str, Dict[str, Any]] = {}
        self.knowledge_feedback: List[Dict[str, Any]] = []
        self.knowledge_jobs: Dict[str, Dict[str, Any]] = {}
        self.integrations: Dict[str, Dict[str, Any]] = {}
        self.agent_tools: Dict[str, Dict[str, Any]] = {}
        self.conversations: Dict[str, Dict[str, Any]] = {}
        self.messages: Dict[str, Dict[str, Any]] = {}
        self.usage_events: List[Dict[str, Any]] = []
        self.subscriptions: Dict[str, Dict[str, Any]] = {}
        self.invoices: Dict[str, Dict[str, Any]] = {}
        self.audit_logs: List[Dict[str, Any]] = []
        self.api_keys: Dict[str, Dict[str, Any]] = {}
        self.webhooks: Dict[str, Dict[str, Any]] = {}
        self.deployments: Dict[str, Dict[str, Any]] = {}
        self.action_executions: Dict[str, Dict[str, Any]] = {}
        self.background_jobs: Dict[str, Dict[str, Any]] = {}
        self.handoff_sessions: Dict[str, Dict[str, Any]] = {}
        self.subscription_plans: Dict[str, Dict[str, Any]] = {}
        self.tenant_keys: Dict[str, Dict[str, Any]] = {}
        self.global_killswitch_active: bool = False
        self.global_killswitch_reason: str = ""
        self.global_killswitch_updated_at: str = ""

        # Initialize Durable Storage (PostgreSQL or SQLite file fallback)
        self.db_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data"))
        os.makedirs(self.db_dir, exist_ok=True)
        self.sqlite_path = os.path.join(self.db_dir, "chat_aaas.db")
        self.storage_file = os.path.join(self.db_dir, "chat_aaas_state.json")

        db_url = settings.DATABASE_URL
        if db_url.startswith("postgresql+asyncpg://"):
            db_url = db_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
        if not db_url or "localhost" in db_url or "127.0.0.1" in db_url:
            db_url = f"sqlite:///{self.sqlite_path}"

        engine_kwargs = {"connect_args": {"check_same_thread": False}} if "sqlite" in db_url else {
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_timeout": settings.DB_POOL_TIMEOUT,
            "pool_recycle": settings.DB_POOL_RECYCLE,
            "pool_pre_ping": True
        }

        try:
            self.engine = create_engine(db_url, **engine_kwargs)
        except Exception as e:
            if settings.ENVIRONMENT == "production":
                raise RuntimeError(f"[DATABASE] Authoritative database connection failed: {e}")
            # Fallback to local SQLite if PostgreSQL is unreachable in dev
            self.engine = create_engine(f"sqlite:///{self.sqlite_path}", connect_args={"check_same_thread": False})

        # Read Replica Engine
        read_url = settings.DATABASE_READ_REPLICA_URL or db_url
        if read_url.startswith("postgresql+asyncpg://"):
            read_url = read_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
        read_kwargs = {"connect_args": {"check_same_thread": False}} if "sqlite" in read_url else {
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_timeout": settings.DB_POOL_TIMEOUT,
            "pool_recycle": settings.DB_POOL_RECYCLE,
            "pool_pre_ping": True
        }
        try:
            self.read_engine = create_engine(read_url, **read_kwargs)
        except Exception:
            self.read_engine = self.engine

        self.SessionLocal = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self.ReadSessionLocal = sessionmaker(bind=self.read_engine, autocommit=False, autoflush=False)

        # Primary load: query authoritative SQL database
        restored = self.load_from_database()
        if not restored:
            # Fallback load from JSON snapshot if database was empty
            restored = self.load_durable_storage()
            if restored:
                self.flush_durable_storage()

        if not restored and settings.SEED_DEMO_DATA and settings.ENVIRONMENT != "production":
            self.seed_demo_data()
            self.flush_durable_storage()

        # Guarantee baseline tenant workspace and agent exist across all environments
        self.ensure_baseline_tenant()

        # Enforce production security check
        if settings.ENVIRONMENT == "production":
            self.enforce_production_security_checks()

    def enforce_production_security_checks(self):
        """
        Audits production credentials and logs security guidance if default demo credentials exist.
        """
        if settings.ENVIRONMENT != "production":
            return
        for u in self.users.values():
            if u.get("email", "").strip().lower() == "admin@chataaas.internal":
                pwd_hash = u.get("passwordHash") or u.get("password_hash") or ""
                if verify_password("SuperAdmin123!", pwd_hash):
                    logger.warning(
                        "[SECURITY] Platform running with initial default credentials (admin@chataaas.internal). "
                        "Please change this password via the admin dashboard or API."
                    )

    def ensure_baseline_tenant(self):
        """
        Guarantees the baseline workspace (comp-techflow) and default agent (agent-tf-1)
        exist in both memory and PostgreSQL so public visitor widgets, chat streaming,
        and multi-tenant routing function immediately upon deployment in all environments.
        """
        now_str = "2026-08-01T00:00:00.000Z"
        if "comp-techflow" not in self.companies:
            self.save_company({
                "id": "comp-techflow",
                "name": "TechFlow Cloud Systems",
                "slug": "techflow-cloud",
                "domain": "techflow.cloud",
                "industry": "Cloud Infrastructure",
                "planId": "business",
                "billingCycle": "monthly",
                "planStatus": "active",
                "isSuspended": False,
                "apiKey": "aas_live_tf_994102941824",
                "apiSecretEncrypted": "enc_kms_sec_techflow_prod",
                "createdAt": now_str
            })
        if "agent-tf-1" not in self.agents:
            self.save_agent({
                "id": "agent-tf-1",
                "companyId": "comp-techflow",
                "name": "FlowBot AI Specialist",
                "description": "Autonomous Technical Support Specialist",
                "avatarUrl": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
                "status": "active",
                "lifecycleStatus": "published",
                "publishedVersionNumber": 1,
                "draftVersionNumber": 1,
                "lastPublishedAt": "2026-08-15T10:00:00.000Z",
                "tone": "professional",
                "activeVersionId": "ver-tf-v1",
                "draftVersionId": "ver-tf-v1",
                "createdAt": now_str
            })
        if "ver-tf-v1" not in self.agent_versions:
            self.save_agent_version({
                "id": "ver-tf-v1",
                "agentId": "agent-tf-1",
                "companyId": "comp-techflow",
                "versionNumber": 1,
                "status": "published",
                "systemInstructions": "You are FlowBot, the enterprise AI Q&A assistant for TechFlow Cloud.",
                "greetingMessage": "Hello! I am FlowBot, your TechFlow Cloud engineering specialist. How can I assist you with our services, pricing, or policies today?",
                "fallbackMessage": "I do not have verified knowledge on this topic. Connecting you to staff.",
                "tone": "professional",
                "allowedActionIds": ["act-tf-1", "act-tf-2"],
                "escalationSettings": {
                    "enabled": True,
                    "triggerKeywords": ["human", "agent", "manager", "refund", "talk to person"],
                    "maxUnansweredQueriesBeforeEscalation": 2,
                    "notifyEmail": "support-team@techflow.cloud",
                    "escalationMessage": "Transferring you to a live support representative.",
                    "requireHumanApprovalForRefund": True
                },
                "customSafetyRules": ["Never fabricate SLA figures without context."],
                "changeSummary": "Initial production version release",
                "publishedAt": "2026-08-15T10:00:00.000Z",
                "createdAt": now_str
            })
        if "act-tf-1" not in self.agent_tools:
            self.save_agent_tool({
                "id": "act-tf-1",
                "companyId": "comp-techflow",
                "code": "check_order_status",
                "name": "Check Order Status",
                "description": "Retrieves real-time status of compute cluster provisioning.",
                "riskLevel": "read_only",
                "requiresUserConfirmation": False,
                "enabled": True,
                "parameters": [{"name": "order_id", "type": "string", "description": "Order ID", "required": True}],
                "endpointConfig": {},
                "createdAt": now_str
            })
        if "act-tf-2" not in self.agent_tools:
            self.save_agent_tool({
                "id": "act-tf-2",
                "companyId": "comp-techflow",
                "code": "execute_refund",
                "name": "Process Customer Refund",
                "description": "Issues financial refund to customer balance.",
                "riskLevel": "high_risk",
                "requiresUserConfirmation": True,
                "confirmationPrompt": "Are you certain you wish to issue a refund for this order?",
                "enabled": True,
                "parameters": [
                    {"name": "order_id", "type": "string", "description": "Order identifier", "required": True},
                    {"name": "amount", "type": "string", "description": "Refund amount in INR", "required": True}
                ],
                "endpointConfig": {},
                "createdAt": now_str
            })
        if "dep-tf-widget" not in self.deployments:
            self.deployments["dep-tf-widget"] = {
                "id": "dep-tf-widget",
                "companyId": "comp-techflow",
                "name": "Production Website Widget",
                "channel": "website_widget",
                "status": "active",
                "assistantVersion": "v1",
                "domain": "techflow.cloud",
                "config": {"theme": "dark", "position": "bottom-right"},
                "lastActiveAt": "2026-09-12T02:30:00.000Z",
                "createdAt": "2026-08-15T10:00:00.000Z"
            }
        if "dep-tf-api" not in self.deployments:
            self.deployments["dep-tf-api"] = {
                "id": "dep-tf-api",
                "companyId": "comp-techflow",
                "name": "Customer Support REST API",
                "channel": "rest_api",
                "status": "active",
                "assistantVersion": "v1",
                "domain": "api.techflow.cloud",
                "config": {"rateLimitPerMin": 120},
                "lastActiveAt": "2026-09-12T02:15:00.000Z",
                "createdAt": "2026-08-20T10:00:00.000Z"
            }
        if "key-tf-prod" not in self.api_keys:
            self.api_keys["key-tf-prod"] = {
                "id": "key-tf-prod",
                "companyId": "comp-techflow",
                "name": "Production API Key",
                "keyPrefix": "aas_live_tf",
                "keyHash": "hash_tf_live_9941",
                "secretMasked": "aas_live_tf_••••••••1824",
                "scopes": ["chat:read", "chat:write"],
                "status": "active",
                "lastUsedAt": "5 minutes ago",
                "createdAt": now_str
            }
        if not self.users:
            self.save_user({
                "id": "usr-root-admin",
                "email": "admin@chataaas.internal",
                "passwordHash": hash_password("SuperAdmin123!"),
                "fullName": "Platform Super Administrator",
                "isEmailVerified": True,
                "isSuspended": False,
                "createdAt": now_str
            })
            self.save_membership({
                "id": "mem-root-admin",
                "userId": "usr-root-admin",
                "companyId": "comp-techflow",
                "role": "super_admin",
                "status": "active",
                "createdAt": now_str
            })
            self.save_user({
                "id": "usr-alex",
                "email": "alex@techflow.io",
                "passwordHash": hash_password("Password123!"),
                "fullName": "Alex Vance",
                "isEmailVerified": True,
                "isSuspended": False,
                "createdAt": now_str
            })
            self.save_membership({
                "id": "mem-alex",
                "userId": "usr-alex",
                "companyId": "comp-techflow",
                "role": "owner",
                "status": "active",
                "createdAt": now_str
            })

    def seed_agent_versions(self):
        if "ver-tf-v1" not in self.agent_versions:
            self.agent_versions["ver-tf-v1"] = {
                "id": "ver-tf-v1",
                "agentId": "agent-tf-1",
                "companyId": "comp-techflow",
                "versionNumber": 1,
                "status": "published",
                "systemInstructions": "You are FlowBot, the enterprise AI Q&A assistant for TechFlow Cloud.",
                "greetingMessage": "Hello! I am FlowBot, your TechFlow Cloud engineering specialist.",
                "fallbackMessage": "I do not have verified knowledge on this topic. Connecting you to staff.",
                "tone": "professional",
                "allowedActionIds": ["act-tf-1", "act-tf-2"],
                "escalationSettings": {
                    "enabled": True,
                    "triggerKeywords": ["human", "agent", "manager", "refund", "talk to person"],
                    "maxUnansweredQueriesBeforeEscalation": 2,
                    "notifyEmail": "support-team@techflow.cloud",
                    "escalationMessage": "Transferring you to a live support representative.",
                    "requireHumanApprovalForRefund": True
                },
                "customSafetyRules": ["Never fabricate SLA figures without context."],
                "changeSummary": "Initial production version release",
                "publishedAt": "2026-08-15T10:00:00.000Z",
                "createdAt": "2026-08-15T10:00:00.000Z"
            }

    def seed_agent_tools(self):
        now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        if "act-tf-1" not in self.agent_tools:
            self.agent_tools["act-tf-1"] = {
                "id": "act-tf-1",
                "companyId": "comp-techflow",
                "code": "check_order_status",
                "name": "Check Order Status",
                "description": "Retrieves real-time status of compute cluster provisioning.",
                "riskLevel": "read_only",
                "requiresUserConfirmation": False,
                "enabled": True,
                "parameters": [{"name": "order_id", "type": "string", "description": "Order ID", "required": True}],
                "endpointConfig": {},
                "createdAt": now_str
            }
        if "act-tf-2" not in self.agent_tools:
            self.agent_tools["act-tf-2"] = {
                "id": "act-tf-2",
                "companyId": "comp-techflow",
                "code": "execute_refund",
                "name": "Process Customer Refund",
                "description": "Issues financial refund to customer balance.",
                "riskLevel": "high_risk",
                "requiresUserConfirmation": True,
                "confirmationPrompt": "Are you certain you wish to issue a refund for this order?",
                "enabled": True,
                "parameters": [
                    {"name": "order_id", "type": "string", "description": "Order identifier", "required": True},
                    {"name": "amount", "type": "string", "description": "Refund amount in INR", "required": True}
                ],
                "endpointConfig": {},
                "createdAt": now_str
            }

    def seed_deployment_guide(self):
        pass

    @contextmanager
    def get_session(self, company_id: Optional[str] = None, is_super_admin: bool = False):
        """Transactional session context manager with PostgreSQL RLS support."""
        session = self.SessionLocal()
        try:
            if self.engine.dialect.name == "postgresql":
                if is_super_admin:
                    session.execute(text("SET LOCAL app.is_super_admin = 'true'"))
                elif company_id:
                    session.execute(text("SET LOCAL app.current_tenant_id = :cid"), {"cid": company_id})
                    session.execute(text("SET LOCAL app.is_super_admin = 'false'"))
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    @contextmanager
    def get_read_session(self, company_id: Optional[str] = None, is_super_admin: bool = False):
        """Read-only session context manager routed to read replica when available."""
        session = self.ReadSessionLocal()
        try:
            if self.read_engine.dialect.name == "postgresql":
                if is_super_admin:
                    session.execute(text("SET LOCAL app.is_super_admin = 'true'"))
                elif company_id:
                    session.execute(text("SET LOCAL app.current_tenant_id = :cid"), {"cid": company_id})
                    session.execute(text("SET LOCAL app.is_super_admin = 'false'"))
            yield session
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def get_pool_status(self) -> Dict[str, Any]:
        """Returns connection pool utilization metrics for observability."""
        pool = getattr(self.engine, "pool", None)
        if not pool:
            return {"status": "unsupported"}
        return {
            "size": pool.size() if hasattr(pool, "size") else 0,
            "checkedin": pool.checkedin() if hasattr(pool, "checkedin") else 0,
            "checkedout": pool.checkedout() if hasattr(pool, "checkedout") else 0,
            "overflow": pool.overflow() if hasattr(pool, "overflow") else 0
        }

    def record_audit_log(
        self,
        company_id: str,
        actor_id: str,
        actor_role: str,
        action: str,
        target_resource: str,
        target_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        details: Optional[str] = None,
        severity: str = "info",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Atomically appends and persists an immutable audit log entry."""
        log_id = f"aud_{int(time.time() * 1000)}_{len(self.audit_logs) + 1}"
        meta = dict(metadata or {})
        if details:
            meta["details"] = details
        meta["severity"] = severity

        now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        log_entry = {
            "id": log_id,
            "companyId": company_id,
            "actor": actor_id,
            "actorId": actor_id,
            "actorRole": actor_role,
            "action": action,
            "targetResource": target_resource,
            "targetId": target_id,
            "ipAddress": ip_address,
            "details": details or action,
            "severity": severity,
            "metadata": meta,
            "timestamp": now_str,
            "createdAt": now_str
        }
        self.audit_logs.insert(0, log_entry)

        # Durable write
        try:
            with self.get_session() as session:
                session.merge(AuditLog(
                    id=log_id,
                    company_id=company_id,
                    actor_id=actor_id,
                    actor_role=actor_role,
                    action=action,
                    target_resource=target_resource,
                    target_id=target_id,
                    ip_address=ip_address,
                    metadata_json=meta,
                    created_at=now_str
                ))
        except Exception:
            pass

        return log_entry

    def save_user(self, user: Dict[str, Any]):
        """Targeted write: persists a single user to SQL and memory."""
        uid = user["id"]
        self.users[uid] = user
        try:
            with self.get_session() as session:
                session.merge(User(
                    id=uid,
                    email=user.get("email"),
                    password_hash=user.get("passwordHash", ""),
                    full_name=user.get("fullName", "User"),
                    avatar_url=user.get("avatarUrl"),
                    is_email_verified=bool(user.get("isEmailVerified", False)),
                    is_suspended=bool(user.get("isSuspended", False)),
                    created_at=user.get("createdAt", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                ))
        except Exception:
            pass

    def save_company(self, comp: Dict[str, Any]):
        """Targeted write: persists a single company to SQL and memory."""
        cid = comp["id"]
        self.companies[cid] = comp
        try:
            with self.get_session() as session:
                session.merge(Company(
                    id=cid,
                    name=comp.get("name", "Company"),
                    slug=comp.get("slug", cid),
                    domain=comp.get("domain"),
                    industry=comp.get("industry"),
                    plan_id=comp.get("planId", "starter"),
                    billing_cycle=comp.get("billingCycle", "monthly"),
                    plan_status=comp.get("planStatus", "active"),
                    is_suspended=bool(comp.get("isSuspended", False)),
                    api_key=comp.get("apiKey"),
                    api_secret_encrypted=comp.get("apiSecretEncrypted"),
                    settings=comp.get("settings", {}),
                    created_at=comp.get("createdAt", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                ))
        except Exception:
            pass

    def save_membership(self, mem: Dict[str, Any]):
        """Targeted write: persists a single membership to SQL and memory."""
        mid = mem["id"]
        self.memberships[mid] = mem
        try:
            with self.get_session() as session:
                session.merge(Membership(
                    id=mid,
                    user_id=mem.get("userId"),
                    company_id=mem.get("companyId"),
                    role=mem.get("role", "viewer"),
                    status=mem.get("status", "active"),
                    created_at=mem.get("createdAt", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                ))
        except Exception:
            pass

    def delete_membership(self, membership_id: str, company_id: Optional[str] = None):
        """Targeted delete: removes a membership from SQL and memory."""
        if membership_id in self.memberships:
            del self.memberships[membership_id]
        try:
            with self.get_session() as session:
                stmt = Base.metadata.tables["memberships"].delete().where(
                    Base.metadata.tables["memberships"].c.id == membership_id
                )
                if company_id:
                    stmt = stmt.where(Base.metadata.tables["memberships"].c.company_id == company_id)
                session.execute(stmt)
        except Exception:
            pass

    def save_conversation(self, conv: Dict[str, Any]):
        """Targeted write: persists a single conversation to SQL and memory."""
        conv_id = conv["id"]
        self.conversations[conv_id] = conv
        try:
            with self.get_session() as session:
                session.merge(Conversation(
                    id=conv_id,
                    company_id=conv.get("companyId"),
                    customer_session_id=conv.get("customerSessionId"),
                    customer_name=conv.get("customerName", "Website Visitor"),
                    customer_email=conv.get("customerEmail"),
                    channel=conv.get("channel", "website_widget"),
                    status=conv.get("status", "active"),
                    sentiment=conv.get("sentiment", "neutral"),
                    assigned_human_id=conv.get("assignedHumanId") or conv.get("assignedOperator"),
                    internal_notes=conv.get("internalNotes") or conv.get("handoffReason"),
                    tags=conv.get("tags", []),
                    total_tokens_used=conv.get("totalTokensUsed", 0),
                    started_at=conv.get("startedAt", time.strftime("%Y-%m-%dT%H:%M:%SZ")),
                    last_message_at=conv.get("lastMessageAt", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                ))
        except Exception:
            pass

    def save_message(self, msg: Dict[str, Any]):
        """Targeted write: persists a single message to SQL and memory."""
        msg_id = msg["id"]
        self.messages[msg_id] = msg
        try:
            with self.get_session() as session:
                session.merge(Message(
                    id=msg_id,
                    conversation_id=msg.get("conversationId"),
                    company_id=msg.get("companyId"),
                    sender_type=msg.get("sender") or msg.get("senderType", "user"),
                    sender_id=msg.get("senderId"),
                    sender_name=msg.get("senderName"),
                    content=msg.get("text") or msg.get("content", ""),
                    citations=msg.get("citations", []),
                    tool_traces=msg.get("toolTraces", []),
                    tokens_consumed=msg.get("tokensUsed") or msg.get("tokensConsumed", 0),
                    created_at=msg.get("createdAt", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                ))
        except Exception:
            pass

    def save_invoice(self, inv: Dict[str, Any]):
        """Targeted write: persists a single invoice to SQL and memory."""
        inv_id = inv["id"]
        self.invoices[inv_id] = inv
        try:
            with self.get_session() as session:
                session.merge(Invoice(
                    id=inv_id,
                    company_id=inv.get("companyId"),
                    invoice_number=inv.get("invoiceNumber", f"INV-{inv_id}"),
                    date=inv.get("date", time.strftime("%Y-%m-%d")),
                    plan_name=inv.get("planName", "Subscription Plan"),
                    subtotal_inr=float(inv.get("subtotalINR") or inv.get("subtotal_inr", 0.0)),
                    tax_rate_percent=float(inv.get("taxRatePercent") or inv.get("tax_rate_percent", 18.0)),
                    tax_amount_inr=float(inv.get("taxAmountINR") or inv.get("tax_amount_inr", 0.0)),
                    total_amount_inr=float(inv.get("amountINR") or inv.get("totalINR") or inv.get("total_amount_inr", 0.0)),
                    tax_breakdown=inv.get("taxBreakdown") or inv.get("tax_breakdown", {}),
                    status=inv.get("status", "paid"),
                    pdf_url=inv.get("pdfUrl") or inv.get("pdf_url"),
                    created_at=inv.get("createdAt", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                ))
        except Exception:
            pass

    def save_agent(self, agent: Dict[str, Any]):
        """Targeted write: persists a single agent to SQL and memory."""
        aid = agent["id"]
        self.agents[aid] = agent
        try:
            with self.get_session() as session:
                session.merge(Agent(
                    id=aid,
                    company_id=agent.get("companyId") or agent.get("company_id"),
                    name=agent.get("name", "AI Assistant"),
                    description=agent.get("description"),
                    avatar_url=agent.get("avatarUrl") or agent.get("avatar_url"),
                    status=agent.get("status", "active"),
                    lifecycle_status=agent.get("lifecycleStatus") or agent.get("lifecycle_status", "published"),
                    published_version_number=agent.get("publishedVersionNumber") or agent.get("published_version_number", 1),
                    draft_version_number=agent.get("draftVersionNumber") or agent.get("draft_version_number", 1),
                    last_published_at=agent.get("lastPublishedAt") or agent.get("last_published_at"),
                    tone=agent.get("tone", "professional"),
                    active_version_id=agent.get("activeVersionId") or agent.get("active_version_id"),
                    draft_version_id=agent.get("draftVersionId") or agent.get("draft_version_id"),
                    created_at=agent.get("createdAt") or agent.get("created_at", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                ))
        except Exception:
            pass

    def save_agent_version(self, ver: Dict[str, Any]):
        """Targeted write: persists a single agent version to SQL and memory."""
        vid = ver["id"]
        self.agent_versions[vid] = ver
        try:
            with self.get_session() as session:
                session.merge(AgentVersion(
                    id=vid,
                    agent_id=ver.get("agentId") or ver.get("agent_id"),
                    company_id=ver.get("companyId") or ver.get("company_id"),
                    version_number=ver.get("versionNumber") or ver.get("version_number", 1),
                    status=ver.get("status", "draft"),
                    system_instructions=ver.get("systemInstructions") or ver.get("system_instructions"),
                    greeting_message=ver.get("greetingMessage") or ver.get("greeting_message"),
                    fallback_message=ver.get("fallbackMessage") or ver.get("fallback_message"),
                    tone=ver.get("tone", "professional"),
                    model=ver.get("model", "gpt-4o"),
                    temperature=float(ver.get("temperature", 0.2)),
                    allowed_action_ids=ver.get("allowedActionIds") or ver.get("allowed_action_ids", []),
                    escalation_settings=ver.get("escalationSettings") or ver.get("escalation_settings", {}),
                    custom_safety_rules=ver.get("customSafetyRules") or ver.get("custom_safety_rules", []),
                    change_summary=ver.get("changeSummary") or ver.get("change_summary"),
                    published_by_user_id=ver.get("publishedByUserId") or ver.get("published_by_user_id"),
                    published_at=ver.get("publishedAt") or ver.get("published_at"),
                    created_at=ver.get("createdAt") or ver.get("created_at", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                ))
        except Exception:
            pass

    def save_integration(self, integ: Dict[str, Any]):
        """Targeted write: persists a single integration to SQL and memory."""
        iid = integ["id"]
        self.integrations[iid] = integ
        try:
            with self.get_session() as session:
                session.merge(Integration(
                    id=iid,
                    company_id=integ.get("companyId") or integ.get("company_id"),
                    provider=integ.get("provider", ""),
                    status=integ.get("status", "disconnected"),
                    credentials_encrypted=integ.get("credentialsEncrypted") or integ.get("credentials_encrypted"),
                    credentials_nonce=integ.get("credentialsNonce") or integ.get("credentials_nonce"),
                    credentials_key_version=integ.get("credentialsKeyVersion") or integ.get("credentials_key_version", 1),
                    webhook_url=integ.get("webhookUrl") or integ.get("webhook_url"),
                    events_subscribed=integ.get("eventsSubscribed") or integ.get("events_subscribed", []),
                    last_synced_at=integ.get("lastSyncedAt") or integ.get("last_synced_at"),
                    settings=integ.get("settings", {}),
                    created_at=integ.get("createdAt") or integ.get("created_at", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                ))
        except Exception:
            pass

    def get_integrations_for_company(self, company_id: str) -> List[Dict[str, Any]]:
        """Authoritative read: retrieves integrations for a tenant from SQL and syncs memory."""
        try:
            with self.engine.connect() as conn:
                rows = conn.execute(
                    Base.metadata.tables["integrations"].select().where(
                        Base.metadata.tables["integrations"].c.company_id == company_id
                    )
                ).mappings().all()
                if rows:
                    items = []
                    for r in rows:
                        item = {
                            "id": r["id"],
                            "companyId": r["company_id"],
                            "provider": r["provider"],
                            "name": r.get("settings", {}).get("name", r["provider"].title()),
                            "status": r["status"],
                            "encryptedCredentials": r["credentials_encrypted"],
                            "credentialsNonce": r["credentials_nonce"],
                            "credentialsKeyVersion": r["credentials_key_version"],
                            "webhookUrl": r["webhook_url"],
                            "eventsSubscribed": r["events_subscribed"] or [],
                            "config": r["settings"] or {},
                            "connectedAt": r["created_at"],
                            "createdAt": r["created_at"]
                        }
                        self.integrations[r["id"]] = item
                        items.append(item)
                    return items
        except Exception:
            pass
        return [i for i in self.integrations.values() if i.get("companyId") == company_id]

    def delete_integration(self, integration_id: str, company_id: str):
        """Targeted delete: removes an integration from SQL and memory."""
        if integration_id in self.integrations:
            del self.integrations[integration_id]
        try:
            with self.get_session() as session:
                session.execute(
                    Base.metadata.tables["integrations"].delete().where(
                        Base.metadata.tables["integrations"].c.id == integration_id,
                        Base.metadata.tables["integrations"].c.company_id == company_id
                    )
                )
        except Exception:
            pass

    def save_agent_tool(self, tool: Dict[str, Any]):
        """Targeted write: persists a single tool to SQL and memory."""
        tid = tool["id"]
        self.agent_tools[tid] = tool
        try:
            with self.get_session() as session:
                session.merge(AgentTool(
                    id=tid,
                    company_id=tool.get("companyId") or tool.get("company_id"),
                    code=tool.get("code", ""),
                    name=tool.get("name", ""),
                    description=tool.get("description"),
                    risk_level=tool.get("riskLevel") or tool.get("risk_level", "low_risk"),
                    requires_user_confirmation=bool(tool.get("requiresUserConfirmation") or tool.get("requires_user_confirmation", False)),
                    confirmation_prompt=tool.get("confirmationPrompt") or tool.get("confirmation_prompt"),
                    enabled=bool(tool.get("enabled", True)),
                    parameters_schema=tool.get("parameters") or tool.get("parameters_schema", []),
                    endpoint_config_encrypted=tool.get("endpointConfig") or tool.get("endpoint_config_encrypted", {}),
                    created_at=tool.get("createdAt") or tool.get("created_at", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                ))
        except Exception:
            pass

    def save_knowledge_source(self, ks: Dict[str, Any]):
        """Targeted write: persists a single knowledge source to SQL and memory."""
        ks_id = ks["id"]
        self.knowledge_sources[ks_id] = ks
        try:
            with self.get_session() as session:
                session.merge(KnowledgeSource(
                    id=ks_id,
                    company_id=ks.get("companyId") or ks.get("company_id"),
                    collection_id=ks.get("collectionId") or ks.get("collection_id"),
                    title=ks.get("title", ""),
                    source_type=ks.get("sourceType") or ks.get("source_type", "document"),
                    file_name=ks.get("fileName") or ks.get("file_name"),
                    file_size_bytes=ks.get("fileSizeBytes") or ks.get("file_size_bytes", 0),
                    version=ks.get("version", 1),
                    source_url=ks.get("sourceUrl") or ks.get("source_url"),
                    category=ks.get("category", "General"),
                    status=ks.get("status", "processing"),
                    lifecycle_state=ks.get("lifecycleState") or ks.get("lifecycle_state", "active"),
                    processing_stage=ks.get("processingStage") or ks.get("processing_stage", "queued"),
                    error_message=ks.get("errorMessage") or ks.get("error_message"),
                    retention_days=ks.get("retentionDays") or ks.get("retention_days", 90),
                    last_indexed_at=ks.get("lastIndexedAt") or ks.get("last_indexed_at"),
                    chunk_count=ks.get("chunkCount") or ks.get("chunk_count", 0),
                    total_tokens=ks.get("totalTokens") or ks.get("total_tokens", 0),
                    last_synced_at=ks.get("lastSyncedAt") or ks.get("last_synced_at"),
                    created_at=ks.get("createdAt") or ks.get("created_at", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                ))
        except Exception:
            pass

    def save_document_chunk(self, chunk: Dict[str, Any]):
        """Targeted write: persists a single document chunk to SQL and memory."""
        cid = chunk["id"]
        self.document_chunks[cid] = chunk
        try:
            with self.get_session() as session:
                session.merge(DocumentChunk(
                    id=cid,
                    knowledge_source_id=chunk.get("knowledgeSourceId") or chunk.get("knowledge_source_id"),
                    company_id=chunk.get("companyId") or chunk.get("company_id"),
                    collection_id=chunk.get("collectionId") or chunk.get("collection_id"),
                    chunk_index=chunk.get("chunkIndex") or chunk.get("chunk_index", 0),
                    content=chunk.get("content", ""),
                    token_count=chunk.get("tokenCount") or chunk.get("token_count", 0),
                    section_header=chunk.get("sectionHeader") or chunk.get("section_header"),
                    embedding=chunk.get("embedding"),
                    metadata_json=chunk.get("metadata") or chunk.get("metadata_json", {}),
                    created_at=chunk.get("createdAt") or chunk.get("created_at", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                ))
        except Exception:
            pass

    def save_subscription(self, sub: Dict[str, Any]):
        """Targeted write: persists a single subscription to SQL and memory."""
        sid = sub["id"]
        self.subscriptions[sid] = sub
        try:
            with self.get_session() as session:
                session.merge(Subscription(
                    id=sid,
                    company_id=sub.get("companyId") or sub.get("company_id"),
                    plan_id=sub.get("planId") or sub.get("plan_id", "starter"),
                    billing_cycle=sub.get("billingCycle") or sub.get("billing_cycle", "monthly"),
                    status=sub.get("status", "active"),
                    current_period_start=sub.get("currentPeriodStart") or sub.get("current_period_start"),
                    current_period_end=sub.get("currentPeriodEnd") or sub.get("current_period_end"),
                    cancel_at_period_end=bool(sub.get("cancelAtPeriodEnd") or sub.get("cancel_at_period_end", False)),
                    razorpay_subscription_id=sub.get("razorpaySubscriptionId") or sub.get("razorpay_subscription_id"),
                    razorpay_customer_id=sub.get("razorpayCustomerId") or sub.get("razorpay_customer_id"),
                    created_at=sub.get("createdAt") or sub.get("created_at", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                ))
        except Exception:
            pass

    def save_webhook(self, hook: Dict[str, Any]):
        """Targeted write: persists a single webhook to SQL and memory."""
        hid = hook["id"]
        self.webhooks[hid] = hook
        try:
            with self.get_session() as session:
                session.merge(Webhook(
                    id=hid,
                    company_id=hook.get("companyId") or hook.get("company_id"),
                    target_url=hook.get("targetUrl") or hook.get("target_url", ""),
                    events=hook.get("events", []),
                    secret_encrypted=hook.get("secret") or hook.get("secret_encrypted", ""),
                    status=hook.get("status", "active"),
                    last_delivery_status=hook.get("lastDeliveryStatus") or hook.get("last_delivery_status"),
                    response_time_ms=hook.get("responseTimeMs") or hook.get("response_time_ms"),
                    last_delivered_at=hook.get("lastDeliveredAt") or hook.get("last_delivered_at"),
                    failure_count=hook.get("failureCount") or hook.get("failure_count", 0),
                    created_at=hook.get("createdAt") or hook.get("created_at", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                ))
        except Exception:
            pass

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Authoritative read: retrieves user by email from SQL, syncing memory cache."""
        if not email:
            return None
        low_email = email.lower().strip()
        try:
            with self.engine.connect() as conn:
                row = conn.execute(
                    Base.metadata.tables["users"].select().where(
                        text("lower(email) = :email")
                    ),
                    {"email": low_email}
                ).mappings().first()
                if row:
                    u = {
                        "id": row["id"],
                        "email": row["email"],
                        "passwordHash": row["password_hash"],
                        "fullName": row["full_name"],
                        "avatarUrl": row["avatar_url"],
                        "isEmailVerified": bool(row["is_email_verified"]),
                        "isSuspended": bool(row.get("is_suspended", False)),
                        "createdAt": row["created_at"]
                    }
                    self.users[row["id"]] = u
                    return u
        except Exception:
            pass
        return next((u for u in self.users.values() if u.get("email", "").lower() == low_email), None)

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        if not user_id:
            return None
        try:
            with self.engine.connect() as conn:
                row = conn.execute(
                    Base.metadata.tables["users"].select().where(
                        Base.metadata.tables["users"].c.id == user_id
                    )
                ).mappings().first()
                if row:
                    u = {
                        "id": row["id"],
                        "email": row["email"],
                        "passwordHash": row["password_hash"],
                        "fullName": row["full_name"],
                        "avatarUrl": row["avatar_url"],
                        "isEmailVerified": bool(row["is_email_verified"]),
                        "isSuspended": bool(row.get("is_suspended", False)),
                        "createdAt": row["created_at"]
                    }
                    self.users[user_id] = u
                    return u
        except Exception:
            pass
        return self.users.get(user_id)

    def get_membership_for_user(self, user_id: str, company_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if not user_id:
            return None
        try:
            with self.engine.connect() as conn:
                stmt = Base.metadata.tables["memberships"].select().where(
                    Base.metadata.tables["memberships"].c.user_id == user_id
                )
                if company_id:
                    stmt = stmt.where(Base.metadata.tables["memberships"].c.company_id == company_id)
                row = conn.execute(stmt).mappings().first()
                if row:
                    m = {
                        "id": row["id"],
                        "userId": row["user_id"],
                        "companyId": row["company_id"],
                        "role": row["role"],
                        "status": row["status"],
                        "createdAt": row["created_at"]
                    }
                    self.memberships[row["id"]] = m
                    return m
        except Exception:
            pass
        return next((m for m in self.memberships.values() if m.get("userId") == user_id and (not company_id or m.get("companyId") == company_id)), None)

    def get_company_by_id(self, company_id: str) -> Optional[Dict[str, Any]]:
        if not company_id:
            return None
        try:
            with self.engine.connect() as conn:
                row = conn.execute(
                    Base.metadata.tables["companies"].select().where(
                        Base.metadata.tables["companies"].c.id == company_id
                    )
                ).mappings().first()
                if row:
                    c = {
                        "id": row["id"],
                        "name": row["name"],
                        "slug": row["slug"],
                        "domain": row["domain"],
                        "industry": row["industry"],
                        "planId": row["plan_id"],
                        "billingCycle": row["billing_cycle"],
                        "planStatus": row["plan_status"],
                        "isSuspended": bool(row["is_suspended"]),
                        "apiKey": row["api_key"],
                        "apiSecretEncrypted": row["api_secret_encrypted"],
                        "settings": row["settings"] or {},
                        "createdAt": row["created_at"]
                    }
                    self.companies[company_id] = c
                    return c
        except Exception:
            pass
        return self.companies.get(company_id)

    def get_conversation_by_id(self, conversation_id: str, company_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if not conversation_id:
            return None
        try:
            with self.engine.connect() as conn:
                stmt = Base.metadata.tables["conversations"].select().where(
                    Base.metadata.tables["conversations"].c.id == conversation_id
                )
                if company_id:
                    stmt = stmt.where(Base.metadata.tables["conversations"].c.company_id == company_id)
                row = conn.execute(stmt).mappings().first()
                if row:
                    conv = {
                        "id": row["id"],
                        "companyId": row["company_id"],
                        "customerSessionId": row["customer_session_id"],
                        "customerName": row["customer_name"],
                        "customerEmail": row["customer_email"],
                        "channel": row["channel"],
                        "status": row["status"],
                        "sentiment": row["sentiment"],
                        "assignedOperator": row["assigned_human_id"],
                        "handoffReason": row["internal_notes"],
                        "tags": row["tags"] or [],
                        "totalTokensUsed": row["total_tokens_used"],
                        "startedAt": row["started_at"],
                        "lastMessageAt": row["last_message_at"]
                    }
                    self.conversations[conversation_id] = conv
                    return conv
        except Exception:
            pass
        conv = self.conversations.get(conversation_id)
        if conv and (not company_id or conv.get("companyId") == company_id):
            return conv
        return None

    def save_state(self):
        """Alias for flush_durable_storage."""
        self.flush_durable_storage()

    def flush_durable_storage(self):
        """Persists customer state durably to PostgreSQL / SQLite database."""
        try:
            with self.get_session() as session:
                for cid, c in self.companies.items():
                    session.merge(Company(
                        id=cid,
                        name=c.get("name", "Company"),
                        slug=c.get("slug", cid),
                        domain=c.get("domain"),
                        industry=c.get("industry"),
                        plan_id=c.get("planId", "starter"),
                        billing_cycle=c.get("billingCycle", "monthly"),
                        plan_status=c.get("planStatus", "active"),
                        is_suspended=bool(c.get("isSuspended", False)),
                        api_key=c.get("apiKey"),
                        api_secret_encrypted=c.get("apiSecretEncrypted"),
                        settings=c.get("settings", {}),
                        created_at=c.get("createdAt", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                    ))

                for uid, u in self.users.items():
                    session.merge(User(
                        id=uid,
                        email=u.get("email"),
                        password_hash=u.get("passwordHash", ""),
                        full_name=u.get("fullName", "User"),
                        avatar_url=u.get("avatarUrl"),
                        is_email_verified=bool(u.get("isEmailVerified", False)),
                        is_suspended=bool(u.get("isSuspended", False)),
                        created_at=u.get("createdAt", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                    ))

                for mid, m in self.memberships.items():
                    session.merge(Membership(
                        id=mid,
                        user_id=m.get("userId"),
                        company_id=m.get("companyId"),
                        role=m.get("role", "viewer"),
                        status=m.get("status", "active"),
                        created_at=m.get("createdAt", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                    ))

                for aid, a in self.agents.items():
                    session.merge(Agent(
                        id=aid,
                        company_id=a.get("companyId"),
                        name=a.get("name", "Coar AI"),
                        description=a.get("description"),
                        avatar_url=a.get("avatarUrl"),
                        status=a.get("status", "active"),
                        lifecycle_status=a.get("lifecycleStatus", "published"),
                        published_version_number=a.get("publishedVersionNumber", 1),
                        draft_version_number=a.get("draftVersionNumber", 1),
                        last_published_at=a.get("lastPublishedAt"),
                        tone=a.get("tone", "professional"),
                        active_version_id=a.get("activeVersionId"),
                        draft_version_id=a.get("draftVersionId"),
                        created_at=a.get("createdAt", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                    ))

                for vid, v in self.agent_versions.items():
                    session.merge(AgentVersion(
                        id=vid,
                        agent_id=v.get("agentId", ""),
                        company_id=v.get("companyId", ""),
                        version_number=v.get("versionNumber", 1),
                        status=v.get("status", "draft"),
                        system_instructions=v.get("systemInstructions"),
                        greeting_message=v.get("greetingMessage"),
                        fallback_message=v.get("fallbackMessage"),
                        tone=v.get("tone", "professional"),
                        model=v.get("model", "gpt-4o"),
                        temperature=float(v.get("temperature", 0.2)),
                        allowed_action_ids=v.get("allowedActionIds", []),
                        escalation_settings=v.get("escalationSettings", {}),
                        custom_safety_rules=v.get("customSafetyRules", []),
                        change_summary=v.get("changeSummary"),
                        published_by_user_id=v.get("publishedByUserId"),
                        published_at=v.get("publishedAt"),
                        created_at=v.get("createdAt", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                    ))

                for sid, s in self.knowledge_sources.items():
                    session.merge(KnowledgeSource(
                        id=sid,
                        company_id=s.get("companyId"),
                        collection_id=s.get("collectionId"),
                        title=s.get("title", "Untitled"),
                        source_type=s.get("sourceType", "file"),
                        file_name=s.get("fileName"),
                        file_size_bytes=s.get("fileSizeBytes", 0),
                        version=s.get("version", 1),
                        source_url=s.get("sourceUrl"),
                        category=s.get("category", "General"),
                        status=s.get("status", "ready"),
                        lifecycle_state=s.get("lifecycleState", "active"),
                        processing_stage=s.get("processingStage", "indexed"),
                        deleted_at=s.get("deletedAt"),
                        chunk_count=s.get("totalChunks", 0),
                        total_tokens=s.get("tokenCount", 0),
                        created_at=s.get("createdAt", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                    ))

                for chkid, chk in self.document_chunks.items():
                    session.merge(DocumentChunk(
                        id=chkid,
                        knowledge_source_id=chk.get("knowledgeSourceId") or chk.get("knowledge_source_id"),
                        company_id=chk.get("companyId"),
                        collection_id=chk.get("collectionId"),
                        chunk_index=chk.get("chunkIndex", 0),
                        content=chk.get("content", ""),
                        token_count=chk.get("tokenCount", 0),
                        metadata_json=chk.get("metadata", {}),
                        created_at=chk.get("createdAt", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                    ))

                for actid, act in self.action_executions.items():
                    session.merge(ActionExecution(
                        id=actid,
                        company_id=act.get("companyId"),
                        tool_code=act.get("toolCode", ""),
                        idempotency_key=act.get("idempotencyKey"),
                        status=act.get("status", "created"),
                        risk_level=act.get("riskLevel", "low_risk"),
                        requires_user_confirmation=bool(act.get("requiresUserConfirmation", False)),
                        is_confirmed=bool(act.get("isConfirmed", False)),
                        parameters=act.get("parameters", {}),
                        result=act.get("result"),
                        error=act.get("error"),
                        created_at=act.get("createdAt", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                    ))

                for iid, item in self.integrations.items():
                    session.merge(Integration(
                        id=iid,
                        company_id=item.get("companyId"),
                        provider=item.get("provider", "webhook"),
                        name=item.get("name", "Integration"),
                        status=item.get("status", "connected"),
                        encrypted_credentials=item.get("encryptedCredentials"),
                        config=item.get("config", {}),
                        connected_at=item.get("connectedAt"),
                        created_at=item.get("createdAt", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                    ))

                for tid, tool in self.agent_tools.items():
                    session.merge(AgentTool(
                        id=tid,
                        company_id=tool.get("companyId"),
                        code=tool.get("code", ""),
                        name=tool.get("name", "Tool"),
                        description=tool.get("description", ""),
                        risk_level=tool.get("riskLevel", "low_risk"),
                        requires_user_confirmation=bool(tool.get("requiresUserConfirmation", False)),
                        confirmation_prompt=tool.get("confirmationPrompt"),
                        enabled=bool(tool.get("enabled", True)),
                        parameters=tool.get("parameters", []),
                        endpoint_config=tool.get("endpointConfig", {}),
                        created_at=tool.get("createdAt", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                    ))

                for log in self.audit_logs:
                    session.merge(AuditLog(
                        id=log.get("id"),
                        company_id=log.get("companyId", "comp-platform"),
                        actor_id=log.get("actorId") or log.get("actor", "system"),
                        actor_role=log.get("actorRole", "super_admin"),
                        action=log.get("action", "SYSTEM_EVENT"),
                        target_resource=log.get("targetResource", "platform"),
                        target_id=log.get("targetId"),
                        ip_address=log.get("ipAddress"),
                        metadata_json=log.get("metadata", {}),
                        created_at=log.get("createdAt") or log.get("timestamp", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
                    ))

                for cid, tk in self.tenant_keys.items():
                    session.merge(TenantKeyMetadata(
                        company_id=cid,
                        wrapped_dek=tk.get("wrapped_dek", ""),
                        nonce=tk.get("nonce", ""),
                        algorithm=tk.get("algorithm", "AES-256-GCM"),
                        version=tk.get("version", 1),
                        created_at=tk.get("created_at", time.strftime("%Y-%m-%dT%H:%M:%SZ")),
                        rotated_at=tk.get("rotated_at")
                    ))
        except Exception as e:
            print("FLUSH ERROR:", e)

        # Optional snapshot backup
        try:
            snapshot = {
                "users": self.users,
                "companies": self.companies,
                "memberships": self.memberships,
                "agents": self.agents,
                "agent_versions": self.agent_versions,
                "knowledge_collections": self.knowledge_collections,
                "knowledge_sources": self.knowledge_sources,
                "document_chunks": self.document_chunks,
                "knowledge_gaps": self.knowledge_gaps,
                "knowledge_jobs": self.knowledge_jobs,
                "integrations": self.integrations,
                "agent_tools": self.agent_tools,
                "conversations": self.conversations,
                "messages": self.messages,
                "invoices": self.invoices,
                "audit_logs": self.audit_logs,
                "api_keys": self.api_keys,
                "webhooks": self.webhooks,
                "deployments": self.deployments,
                "action_executions": self.action_executions,
                "background_jobs": self.background_jobs,
                "handoff_sessions": self.handoff_sessions,
                "subscription_plans": self.subscription_plans,
                "tenant_keys": self.tenant_keys
            }
            tmp_path = self.storage_file + ".tmp"
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(snapshot, f, ensure_ascii=False, indent=2)
            os.replace(tmp_path, self.storage_file)
        except Exception:
            pass

    def load_from_database(self) -> bool:
        """Loads authoritative state directly from SQL database tables."""
        try:
            with self.engine.connect() as conn:
                comp_rows = conn.execute(Base.metadata.tables["companies"].select()).mappings().all()
                for r in comp_rows:
                    self.companies[r["id"]] = {
                        "id": r["id"],
                        "name": r["name"],
                        "slug": r["slug"],
                        "domain": r["domain"],
                        "industry": r["industry"],
                        "planId": r["plan_id"],
                        "billingCycle": r["billing_cycle"],
                        "planStatus": r["plan_status"],
                        "isSuspended": bool(r["is_suspended"]),
                        "apiKey": r["api_key"],
                        "apiSecretEncrypted": r["api_secret_encrypted"],
                        "settings": r["settings"] or {},
                        "createdAt": r["created_at"]
                    }

                user_rows = conn.execute(Base.metadata.tables["users"].select()).mappings().all()
                for r in user_rows:
                    self.users[r["id"]] = {
                        "id": r["id"],
                        "email": r["email"],
                        "passwordHash": r["password_hash"],
                        "fullName": r["full_name"],
                        "avatarUrl": r["avatar_url"],
                        "isEmailVerified": bool(r["is_email_verified"]),
                        "isSuspended": bool(r.get("is_suspended", False)),
                        "createdAt": r["created_at"]
                    }

                mem_rows = conn.execute(Base.metadata.tables["memberships"].select()).mappings().all()
                for r in mem_rows:
                    self.memberships[r["id"]] = {
                        "id": r["id"],
                        "userId": r["user_id"],
                        "companyId": r["company_id"],
                        "role": r["role"],
                        "status": r["status"],
                        "createdAt": r["created_at"]
                    }

                agent_rows = conn.execute(Base.metadata.tables["agents"].select()).mappings().all()
                for r in agent_rows:
                    self.agents[r["id"]] = {
                        "id": r["id"],
                        "companyId": r["company_id"],
                        "name": r["name"],
                        "description": r["description"],
                        "avatarUrl": r["avatar_url"],
                        "status": r["status"],
                        "lifecycleStatus": r["lifecycle_status"],
                        "publishedVersionNumber": r["published_version_number"],
                        "draftVersionNumber": r["draft_version_number"],
                        "lastPublishedAt": r["last_published_at"],
                        "tone": r["tone"],
                        "activeVersionId": r["active_version_id"],
                        "draftVersionId": r["draft_version_id"],
                        "createdAt": r["created_at"]
                    }

                ver_rows = conn.execute(Base.metadata.tables["agent_versions"].select()).mappings().all()
                for r in ver_rows:
                    self.agent_versions[r["id"]] = {
                        "id": r["id"],
                        "agentId": r["agent_id"],
                        "companyId": r["company_id"],
                        "versionNumber": r["version_number"],
                        "status": r["status"],
                        "systemInstructions": r["system_instructions"],
                        "greetingMessage": r["greeting_message"],
                        "fallbackMessage": r["fallback_message"],
                        "tone": r["tone"],
                        "model": r["model"],
                        "temperature": r["temperature"],
                        "allowedActionIds": r["allowed_action_ids"] or [],
                        "escalationSettings": r["escalation_settings"] or {},
                        "customSafetyRules": r["custom_safety_rules"] or [],
                        "changeSummary": r["change_summary"],
                        "publishedByUserId": r["published_by_user_id"],
                        "publishedAt": r["published_at"],
                        "createdAt": r["created_at"]
                    }

                ks_rows = conn.execute(Base.metadata.tables["knowledge_sources"].select()).mappings().all()
                for r in ks_rows:
                    self.knowledge_sources[r["id"]] = {
                        "id": r["id"],
                        "companyId": r["company_id"],
                        "collectionId": r["collection_id"],
                        "title": r["title"],
                        "sourceType": r["source_type"],
                        "fileName": r["file_name"],
                        "fileSizeBytes": r["file_size_bytes"],
                        "version": r["version"],
                        "sourceUrl": r["source_url"],
                        "category": r["category"],
                        "status": r["status"],
                        "lifecycleState": r["lifecycle_state"],
                        "processingStage": r["processing_stage"],
                        "deletedAt": r["deleted_at"],
                        "totalChunks": r["chunk_count"],
                        "tokenCount": r["total_tokens"],
                        "createdAt": r["created_at"]
                    }

                chk_rows = conn.execute(Base.metadata.tables["document_chunks"].select()).mappings().all()
                for r in chk_rows:
                    self.document_chunks[r["id"]] = {
                        "id": r["id"],
                        "knowledgeSourceId": r["knowledge_source_id"],
                        "companyId": r["company_id"],
                        "collectionId": r["collection_id"],
                        "chunkIndex": r["chunk_index"],
                        "content": r["content"],
                        "tokenCount": r["token_count"],
                        "sectionHeader": r.get("section_header"),
                        "embedding": r.get("embedding"),
                        "metadata": r["metadata_json"] or {},
                        "createdAt": r["created_at"]
                    }

                act_rows = conn.execute(Base.metadata.tables["action_executions"].select()).mappings().all()
                for r in act_rows:
                    self.action_executions[r["id"]] = {
                        "id": r["id"],
                        "companyId": r["company_id"],
                        "toolCode": r["tool_code"],
                        "idempotencyKey": r["idempotency_key"],
                        "status": r["status"],
                        "riskLevel": r["risk_level"],
                        "requiresUserConfirmation": bool(r["requires_user_confirmation"]),
                        "isConfirmed": bool(r["is_confirmed"]),
                        "parameters": r["parameters"] or {},
                        "result": r["result"],
                        "error": r["error"],
                        "createdAt": r["created_at"]
                    }

                int_rows = conn.execute(Base.metadata.tables["integrations"].select()).mappings().all()
                for r in int_rows:
                    self.integrations[r["id"]] = {
                        "id": r["id"],
                        "companyId": r["company_id"],
                        "provider": r["provider"],
                        "name": r["name"],
                        "status": r["status"],
                        "encryptedCredentials": r["encrypted_credentials"],
                        "config": r["config"] or {},
                        "connectedAt": r["connected_at"],
                        "createdAt": r["created_at"]
                    }

                tool_rows = conn.execute(Base.metadata.tables["agent_tools"].select()).mappings().all()
                for r in tool_rows:
                    self.agent_tools[r["id"]] = {
                        "id": r["id"],
                        "companyId": r["company_id"],
                        "code": r["code"],
                        "name": r["name"],
                        "description": r["description"],
                        "riskLevel": r["risk_level"],
                        "requiresUserConfirmation": bool(r["requires_user_confirmation"]),
                        "confirmationPrompt": r["confirmation_prompt"],
                        "enabled": bool(r["enabled"]),
                        "parameters": r["parameters"] or []
                    }

                audit_rows = conn.execute(Base.metadata.tables["audit_logs"].select()).mappings().all()
                for r in audit_rows:
                    meta = r["metadata_json"] or {}
                    self.audit_logs.append({
                        "id": r["id"],
                        "companyId": r["company_id"],
                        "actor": r["actor_id"],
                        "actorId": r["actor_id"],
                        "actorRole": r["actor_role"],
                        "action": r["action"],
                        "targetResource": r["target_resource"],
                        "targetId": r["target_id"],
                        "ipAddress": r["ip_address"],
                        "metadata": meta,
                        "timestamp": r["created_at"],
                        "createdAt": r["created_at"],
                        "severity": meta.get("severity", "info"),
                        "details": meta.get("details", r["action"])
                    })

                if "tenant_key_metadata" in Base.metadata.tables:
                    tk_rows = conn.execute(Base.metadata.tables["tenant_key_metadata"].select()).mappings().all()
                    for r in tk_rows:
                        self.tenant_keys[r["company_id"]] = {
                            "company_id": r["company_id"],
                            "wrapped_dek": r["wrapped_dek"],
                            "nonce": r["nonce"],
                            "algorithm": r["algorithm"],
                            "version": r["version"],
                            "created_at": r["created_at"],
                            "rotated_at": r["rotated_at"]
                        }

                return len(self.companies) > 0
        except Exception:
            return False

    def load_durable_storage(self) -> bool:
        """Recovers persisted state from optional JSON snapshot backup."""
        if not os.path.exists(self.storage_file):
            return False
        try:
            with open(self.storage_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not data or not isinstance(data, dict):
                return False
            self.users = data.get("users", {})
            self.companies = data.get("companies", {})
            self.memberships = data.get("memberships", {})
            self.agents = data.get("agents", {})
            self.agent_versions = data.get("agent_versions", {})
            self.knowledge_collections = data.get("knowledge_collections", {})
            self.knowledge_sources = data.get("knowledge_sources", {})
            self.document_chunks = data.get("document_chunks", {})
            self.knowledge_gaps = data.get("knowledge_gaps", {})
            self.knowledge_jobs = data.get("knowledge_jobs", {})
            self.integrations = data.get("integrations", {})
            self.agent_tools = data.get("agent_tools", {})
            self.conversations = data.get("conversations", {})
            self.messages = data.get("messages", {})
            self.invoices = data.get("invoices", {})
            self.audit_logs = data.get("audit_logs", [])
            self.api_keys = data.get("api_keys", {})
            self.webhooks = data.get("webhooks", {})
            self.deployments = data.get("deployments", {})
            self.action_executions = data.get("action_executions", {})
            self.background_jobs = data.get("background_jobs", {})
            self.handoff_sessions = data.get("handoff_sessions", {})
            self.subscription_plans = data.get("subscription_plans", {})
            self.tenant_keys = data.get("tenant_keys", {})
            return len(self.companies) > 0
        except Exception:
            return False

    def clear(self):
        """Clears all database records for fresh tenant and testing initialization."""
        self.users.clear()
        self.companies.clear()
        self.memberships.clear()
        self.agents.clear()
        self.agent_versions.clear()
        self.knowledge_collections.clear()
        self.knowledge_sources.clear()
        self.document_chunks.clear()
        self.knowledge_gaps.clear()
        self.knowledge_feedback.clear()
        self.knowledge_jobs.clear()
        self.integrations.clear()
        self.agent_tools.clear()
        self.conversations.clear()
        self.messages.clear()
        self.usage_events.clear()
        self.subscriptions.clear()
        self.invoices.clear()
        self.audit_logs.clear()
        self.api_keys.clear()
        self.webhooks.clear()
        self.deployments.clear()
        self.action_executions.clear()
        self.background_jobs.clear()
        self.handoff_sessions.clear()
        self.tenant_keys.clear()
        if os.path.exists(self.storage_file):
            try:
                os.remove(self.storage_file)
            except Exception:
                pass
        try:
            with self.engine.begin() as conn:
                for table in reversed(Base.metadata.sorted_tables):
                    conn.execute(table.delete())
        except Exception:
            pass

    def seed_demo_data(self):
        # 1. TechFlow Cloud Production Baseline Tenant
        self.companies["comp-techflow"] = {
            "id": "comp-techflow",
            "name": "TechFlow Cloud Systems",
            "slug": "techflow-cloud",
            "domain": "techflow.cloud",
            "industry": "Cloud Infrastructure",
            "planId": "business",
            "billingCycle": "monthly",
            "planStatus": "active",
            "isSuspended": False,
            "apiKey": "aas_live_tf_994102941824",
            "apiSecretEncrypted": "enc_kms_sec_techflow_prod",
            "createdAt": "2026-08-01T00:00:00.000Z"
        }

        self.users["usr-root-admin"] = {
            "id": "usr-root-admin",
            "email": "admin@chataaas.internal",
            "passwordHash": hash_password("SuperAdmin123!"),
            "fullName": "Platform Super Administrator",
            "isEmailVerified": True,
            "isSuspended": False,
            "createdAt": "2026-08-01T00:00:00.000Z"
        }
        self.memberships["mem-root-admin"] = {
            "id": "mem-root-admin",
            "userId": "usr-root-admin",
            "companyId": "comp-techflow",
            "role": "super_admin",
            "status": "active"
        }

        self.users["usr-alex"] = {
            "id": "usr-alex",
            "email": "alex@techflow.io",
            "passwordHash": hash_password("Password123!"),
            "fullName": "Alex Vance",
            "isEmailVerified": True,
            "isSuspended": False,
            "createdAt": "2026-08-01T00:00:00.000Z"
        }
        self.memberships["mem-alex"] = {
            "id": "mem-alex",
            "userId": "usr-alex",
            "companyId": "comp-techflow",
            "role": "owner",
            "status": "active"
        }

        self.agents["agent-tf-1"] = {
            "id": "agent-tf-1",
            "companyId": "comp-techflow",
            "name": "FlowBot AI Specialist",
            "description": "Autonomous Technical Support Specialist",
            "avatarUrl": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
            "status": "active",
            "lifecycleStatus": "published",
            "publishedVersionNumber": 1,
            "draftVersionNumber": 1,
            "lastPublishedAt": "2026-08-15T10:00:00.000Z",
            "tone": "professional",
            "activeVersionId": "ver-tf-v1",
            "draftVersionId": "ver-tf-v1",
            "createdAt": "2026-08-01T00:00:00.000Z"
        }
        self.agent_versions["ver-tf-v1"] = {
            "id": "ver-tf-v1",
            "agentId": "agent-tf-1",
            "companyId": "comp-techflow",
            "versionNumber": 1,
            "status": "published",
            "systemInstructions": "You are FlowBot, the enterprise AI Q&A assistant for TechFlow Cloud.",
            "greetingMessage": "Hello! I am FlowBot, your TechFlow Cloud engineering specialist.",
            "fallbackMessage": "I do not have verified knowledge on this topic. Connecting you to staff.",
            "tone": "professional",
            "allowedActionIds": ["act-tf-1", "act-tf-2"],
            "escalationSettings": {
                "enabled": True,
                "triggerKeywords": ["human", "agent", "manager", "refund", "talk to person"],
                "maxUnansweredQueriesBeforeEscalation": 2,
                "notifyEmail": "support-team@techflow.cloud",
                "escalationMessage": "Transferring you to a live support representative.",
                "requireHumanApprovalForRefund": True
            },
            "customSafetyRules": ["Never fabricate SLA figures without context."],
            "changeSummary": "Initial production version release",
            "publishedAt": "2026-08-15T10:00:00.000Z",
            "createdAt": "2026-08-15T10:00:00.000Z"
        }

        self.agent_tools["act-tf-1"] = {
            "id": "act-tf-1",
            "companyId": "comp-techflow",
            "code": "check_order_status",
            "name": "Check Order Status",
            "description": "Retrieves real-time status of compute cluster provisioning.",
            "riskLevel": "read_only",
            "requiresUserConfirmation": False,
            "enabled": True,
            "parameters": [{"name": "order_id", "type": "string", "description": "Order ID", "required": True}],
            "endpointConfig": {},
            "createdAt": "2026-08-01T00:00:00.000Z"
        }
        self.agent_tools["act-tf-2"] = {
            "id": "act-tf-2",
            "companyId": "comp-techflow",
            "code": "execute_refund",
            "name": "Process Customer Refund",
            "description": "Issues financial refund to customer balance.",
            "riskLevel": "high_risk",
            "requiresUserConfirmation": True,
            "confirmationPrompt": "Are you certain you wish to issue a refund for this order?",
            "enabled": True,
            "parameters": [
                {"name": "order_id", "type": "string", "description": "Order identifier", "required": True},
                {"name": "amount", "type": "string", "description": "Refund amount in INR", "required": True}
            ],
            "endpointConfig": {},
            "createdAt": "2026-08-01T00:00:00.000Z"
        }

        self.deployments["dep-tf-widget"] = {
            "id": "dep-tf-widget",
            "companyId": "comp-techflow",
            "name": "Production Website Widget",
            "channel": "website_widget",
            "status": "active",
            "assistantVersion": "v1",
            "domain": "techflow.cloud",
            "config": {"theme": "dark", "position": "bottom-right"},
            "lastActiveAt": "2026-09-12T02:30:00.000Z",
            "createdAt": "2026-08-15T10:00:00.000Z"
        }
        self.deployments["dep-tf-api"] = {
            "id": "dep-tf-api",
            "companyId": "comp-techflow",
            "name": "Customer Support REST API",
            "channel": "rest_api",
            "status": "active",
            "assistantVersion": "v1",
            "domain": "api.techflow.cloud",
            "config": {"rateLimitPerMin": 120},
            "lastActiveAt": "2026-09-12T02:15:00.000Z",
            "createdAt": "2026-08-20T10:00:00.000Z"
        }

        self.api_keys["key-tf-prod"] = {
            "id": "key-tf-prod",
            "companyId": "comp-techflow",
            "name": "Production API Key",
            "keyPrefix": "aas_live_tf",
            "keyHash": "hash_tf_live_9941",
            "secretMasked": "aas_live_tf_••••••••1824",
            "scopes": ["chat:read", "chat:write"],
            "status": "active",
            "lastUsedAt": "5 minutes ago",
            "createdAt": "2026-08-01T00:00:00.000Z"
        }

        self.webhooks["hook-tf-prod"] = {
            "id": "hook-tf-prod",
            "companyId": "comp-techflow",
            "targetUrl": "https://api.techflow.cloud/webhooks/ai-events",
            "events": ["conversation.started", "handoff.triggered", "rag.fallback"],
            "description": "Production event listener",
            "secret": "whsec_live_tf_98124",
            "status": "active",
            "lastDeliveryStatus": "200 OK",
            "responseTimeMs": 182,
            "lastDeliveredAt": "2 minutes ago",
            "failureCount": 0,
            "deliveryHistory": [],
            "createdAt": "2026-08-15T10:00:00.000Z"
        }

    def get_messages_for_conversation(self, conversation_id: str, company_id: str) -> List[Dict[str, Any]]:
        try:
            with self.engine.connect() as conn:
                rows = conn.execute(
                    Base.metadata.tables["messages"].select().where(
                        Base.metadata.tables["messages"].c.conversation_id == conversation_id,
                        Base.metadata.tables["messages"].c.company_id == company_id
                    ).order_by(Base.metadata.tables["messages"].c.created_at.asc())
                ).mappings().all()
                if rows:
                    msgs = []
                    for r in rows:
                        msg = {
                            "id": r["id"],
                            "conversationId": r["conversation_id"],
                            "companyId": r["company_id"],
                            "sender": r["sender_type"],
                            "senderType": r["sender_type"],
                            "senderId": r["sender_id"],
                            "senderName": r["sender_name"],
                            "text": r["content"],
                            "content": r["content"],
                            "citations": r["citations"] or [],
                            "toolTraces": r["tool_traces"] or [],
                            "tokensUsed": r["tokens_consumed"] or 0,
                            "tokensConsumed": r["tokens_consumed"] or 0,
                            "createdAt": r["created_at"]
                        }
                        self.messages[r["id"]] = msg
                        msgs.append(msg)
                    return msgs
        except Exception:
            pass
        return [m for m in self.messages.values() if m.get("conversationId") == conversation_id and m.get("companyId") == company_id]

    def get_document_chunks_for_tenant(self, company_id: str, only_active: bool = True) -> List[Dict[str, Any]]:
        chunks = [c for c in self.document_chunks.values() if c.get("companyId") == company_id]
        if only_active:
            active_source_ids = {
                sid for sid, s in self.knowledge_sources.items()
                if s.get("companyId") == company_id
                and s.get("lifecycleState", "active") == "active"
                and s.get("status") not in ["disabled", "trash", "archived"]
            }
            chunks = [
                c for c in chunks
                if (c.get("knowledgeSourceId") or c.get("knowledge_source_id")) in active_source_ids
            ]
        return chunks

    def get_collections_for_tenant(self, company_id: str) -> List[Dict[str, Any]]:
        return [c for c in self.knowledge_collections.values() if c.get("companyId") == company_id]

    def get_knowledge_sources_for_tenant(
        self,
        company_id: str,
        collection_id: Optional[str] = None,
        source_type: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        lifecycle_state: Optional[str] = "active"
    ) -> List[Dict[str, Any]]:
        sources = [s for s in self.knowledge_sources.values() if s.get("companyId") == company_id]

        # Lifecycle state filtering: by default, show 'active' items. 'all' returns everything, 'trash' returns trash.
        if lifecycle_state and lifecycle_state != "all":
            sources = [s for s in sources if s.get("lifecycleState", "active") == lifecycle_state]

        if collection_id:
            sources = [s for s in sources if s.get("collectionId") == collection_id]
        if source_type and source_type != "all":
            sources = [s for s in sources if s.get("sourceType") == source_type]
        if status and status != "all":
            sources = [s for s in sources if s.get("status") == status]
        if search:
            q = search.lower()
            sources = [s for s in sources if q in s.get("title", "").lower() or q in s.get("category", "").lower()]
        return sources

    def purge_knowledge_source(self, source_id: str, company_id: str) -> int:
        """Permanently purges a knowledge source and completely wipes its document chunks, embeddings, and metadata."""
        if source_id in self.knowledge_sources and self.knowledge_sources[source_id].get("companyId") == company_id:
            del self.knowledge_sources[source_id]

        chunk_ids_to_del = [
            cid for cid, c in self.document_chunks.items()
            if (c.get("knowledgeSourceId") == source_id or c.get("knowledge_source_id") == source_id)
            and c.get("companyId") == company_id
        ]
        for cid in chunk_ids_to_del:
            del self.document_chunks[cid]

        return len(chunk_ids_to_del)

    def get_deployments_for_tenant(self, company_id: str) -> List[Dict[str, Any]]:
        return [d for d in self.deployments.values() if d.get("companyId") == company_id]

    def get_knowledge_gaps_for_tenant(self, company_id: str) -> List[Dict[str, Any]]:
        return [g for g in self.knowledge_gaps.values() if g.get("companyId") == company_id]

    def get_knowledge_health_for_tenant(self, company_id: str) -> Dict[str, Any]:
        sources = self.get_knowledge_sources_for_tenant(company_id)
        gaps = self.get_knowledge_gaps_for_tenant(company_id)
        chunks = self.get_document_chunks_for_tenant(company_id)
        failed_sources = [s for s in sources if s.get("status") == "failed"]
        needs_attention = [s for s in sources if s.get("status") == "needs_attention"]
        processing = [s for s in sources if s.get("status") == "processing"]
        ready = [s for s in sources if s.get("status") in ["ready", "indexed"]]

        # Calculate numeric health score (0-100)
        total_s = max(1, len(sources))
        penalty = (len(failed_sources) * 25) + (len(needs_attention) * 10) + (min(len(gaps), 5) * 4)
        health_score = max(50, min(100, 100 - penalty))

        if health_score >= 85:
            health_status = "Healthy"
        elif health_score >= 65:
            health_status = "Needs Attention"
        else:
            health_status = "Critical"

        issues = []
        if failed_sources:
            issues.append(f"{len(failed_sources)} sources failed processing")
        if needs_attention:
            issues.append(f"{len(needs_attention)} sources require attention")
        if gaps:
            issues.append(f"{len(gaps)} unanswered customer questions detected")

        return {
            "status": health_status,
            "healthScore": health_score,
            "totalSources": len(sources),
            "totalChunks": len(chunks),
            "readyCount": len(ready),
            "processingCount": len(processing),
            "needsAttentionCount": len(needs_attention),
            "failedCount": len(failed_sources),
            "gapsCount": len(gaps),
            "issues": issues,
            "lastUpdated": "Just now"
        }

    def get_agent_for_company(self, company_id: str) -> Optional[Dict[str, Any]]:
        for a in self.agents.values():
            if a.get("companyId") == company_id:
                return a
        comp = self.companies.get(company_id)
        if comp and comp.get("agent"):
            return comp["agent"]
        return None

    def get_published_version_for_company(self, company_id: str) -> Optional[Dict[str, Any]]:
        agent = self.get_agent_for_company(company_id)
        if not agent:
            return None
        active_ver_id = agent.get("activeVersionId")
        if active_ver_id and active_ver_id in self.agent_versions:
            return self.agent_versions[active_ver_id]
        pub_vers = [v for v in self.agent_versions.values() if v.get("companyId") == company_id and v.get("status") == "published"]
        if pub_vers:
            pub_vers.sort(key=lambda v: v.get("versionNumber", 1), reverse=True)
            return pub_vers[0]
        return None

    def get_deployment_by_id(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        return self.deployments.get(deployment_id)

    def record_action_execution(self, action_id: str, data: Dict[str, Any]):
        self.action_executions[action_id] = data
        self.flush_durable_storage()

    def get_action_by_idempotency_key(self, company_id: str, idempotency_key: str) -> Optional[Dict[str, Any]]:
        for a in self.action_executions.values():
            if a.get("companyId") == company_id and a.get("idempotencyKey") == idempotency_key:
                return a
        return None

    def update_action_execution(self, action_id: str, updates: Dict[str, Any]):
        if action_id in self.action_executions:
            self.action_executions[action_id].update(updates)
            self.flush_durable_storage()

    def get_tenant_key(self, company_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves persisted tenant DEK metadata from in-memory cache or direct DB query."""
        if company_id in self.tenant_keys:
            return self.tenant_keys[company_id]
        try:
            with self.engine.connect() as conn:
                row = conn.execute(
                    Base.metadata.tables["tenant_key_metadata"].select().where(
                        Base.metadata.tables["tenant_key_metadata"].c.company_id == company_id
                    )
                ).mappings().first()
                if row:
                    meta = {
                        "company_id": row["company_id"],
                        "wrapped_dek": row["wrapped_dek"],
                        "nonce": row["nonce"],
                        "algorithm": row["algorithm"],
                        "version": row["version"],
                        "created_at": row["created_at"],
                        "rotated_at": row["rotated_at"]
                    }
                    self.tenant_keys[company_id] = meta
                    return meta
        except Exception:
            pass
        return None

    def save_tenant_key(self, meta: Dict[str, Any]):
        """Persists tenant DEK metadata to memory and durable SQL database."""
        cid = meta["company_id"]
        self.tenant_keys[cid] = meta
        try:
            with self.get_session() as session:
                session.merge(TenantKeyMetadata(
                    company_id=cid,
                    wrapped_dek=meta["wrapped_dek"],
                    nonce=meta["nonce"],
                    algorithm=meta.get("algorithm", "AES-256-GCM"),
                    version=meta.get("version", 1),
                    created_at=meta.get("created_at", time.strftime("%Y-%m-%dT%H:%M:%SZ")),
                    rotated_at=meta.get("rotated_at")
                ))
        except Exception:
            pass
        self.save_state()

db = DatabaseStore()
engine = db.engine
SessionLocal = db.SessionLocal
