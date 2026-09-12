import os
import json
import time
from typing import Dict, Any, List, Optional
from contextlib import contextmanager
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.security import hash_password
from app.core.config import settings
from app.db.models import (
    Base, Company, User, Membership, Agent, AgentVersion,
    KnowledgeCollection, KnowledgeSource, DocumentChunk,
    KnowledgeGap, KnowledgeFeedback, KnowledgeJob, AgentTool,
    Integration, Subscription, Invoice, AuditLog, ApiKey,
    Webhook, Deployment, ActionExecution, BackgroundJob, HandoffSession
)

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
        self.global_killswitch_active: bool = False
        self.global_killswitch_reason: str = ""
        self.global_killswitch_updated_at: str = ""

        # Initialize Durable Storage (PostgreSQL or SQLite file fallback)
        self.db_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data"))
        os.makedirs(self.db_dir, exist_ok=True)
        self.sqlite_path = os.path.join(self.db_dir, "chat_aaas.db")
        self.storage_file = os.path.join(self.db_dir, "chat_aaas_state.json")

        db_url = settings.DATABASE_URL
        if not db_url or "localhost" in db_url or "127.0.0.1" in db_url:
            db_url = f"sqlite:///{self.sqlite_path}"

        try:
            self.engine = create_engine(db_url, connect_args={"check_same_thread": False} if "sqlite" in db_url else {})
            Base.metadata.create_all(bind=self.engine)
        except Exception as e:
            # Fallback to local SQLite if PostgreSQL is unreachable in dev
            self.engine = create_engine(f"sqlite:///{self.sqlite_path}", connect_args={"check_same_thread": False})
            Base.metadata.create_all(bind=self.engine)

        try:
            with self.engine.begin() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_suspended BOOLEAN DEFAULT 0"))
        except Exception:
            pass

        self.SessionLocal = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)

        # Primary load: query authoritative SQL database
        restored = self.load_from_database()
        if not restored:
            # Fallback load from JSON snapshot if database was empty
            restored = self.load_durable_storage()
            if restored:
                self.flush_durable_storage()

        if not restored and settings.SEED_DEMO_DATA:
            self.seed_demo_data()
            self.flush_durable_storage()

        if len(self.agent_tools) == 0 and "comp-techflow" in self.companies:
            self.seed_agent_tools()
            self.flush_durable_storage()

        if len(self.agent_versions) == 0 and "agent-tf-1" in self.agents:
            self.seed_agent_versions()
            self.flush_durable_storage()

        if "usr-root-admin" not in self.users:
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
            self.flush_durable_storage()

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

    @contextmanager
    def get_session(self):
        """Transactional session context manager."""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

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
                "subscription_plans": self.subscription_plans
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
        # 1. TechFlow Cloud Tenant (Tenant A)
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

        # 2. UrbanCraft Living Tenant (Tenant B)
        self.companies["comp-urbancraft"] = {
            "id": "comp-urbancraft",
            "name": "UrbanCraft Living",
            "slug": "urbancraft-living",
            "domain": "urbancraft.in",
            "industry": "Home & Decor",
            "planId": "growth",
            "billingCycle": "monthly",
            "planStatus": "active",
            "isSuspended": False,
            "apiKey": "aas_live_uc_481029418911",
            "apiSecretEncrypted": "enc_kms_sec_urbancraft_prod",
            "createdAt": "2026-08-05T00:00:00.000Z"
        }

        # 3. FinScale Technologies (Tenant C)
        self.companies["comp-finscale"] = {
            "id": "comp-finscale",
            "name": "FinScale Technologies",
            "slug": "finscale-tech",
            "domain": "finscale.io",
            "industry": "Fintech & Payments",
            "planId": "starter",
            "billingCycle": "annual",
            "planStatus": "active",
            "isSuspended": False,
            "apiKey": "aas_live_fs_112093849102",
            "apiSecretEncrypted": "enc_kms_sec_finscale_prod",
            "createdAt": "2026-08-10T00:00:00.000Z"
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

        # Collections
        self.knowledge_collections["col-tf-1"] = {
            "id": "col-tf-1",
            "companyId": "comp-techflow",
            "name": "Customer Support & SLA",
            "description": "Public SLA guarantees, incident resolution procedures, and contact paths.",
            "icon": "ShieldCheck",
            "color": "indigo",
            "sourceCount": 2,
            "createdAt": "2026-08-15T10:00:00.000Z"
        }
        self.knowledge_collections["col-tf-2"] = {
            "id": "col-tf-2",
            "companyId": "comp-techflow",
            "name": "Pricing & Billing",
            "description": "Subscription plans, add-ons, refund policies, and GST tax computation.",
            "icon": "CreditCard",
            "color": "emerald",
            "sourceCount": 1,
            "createdAt": "2026-08-15T10:00:00.000Z"
        }

        # Knowledge Sources
        self.knowledge_sources["ks-tf-1"] = {
            "id": "ks-tf-1",
            "companyId": "comp-techflow",
            "collectionId": "col-tf-1",
            "title": "TechFlow SLA & Uptime Guarantee",
            "sourceType": "file",
            "fileName": "techflow_sla_2026.pdf",
            "fileSizeBytes": 142000,
            "mimeType": "application/pdf",
            "version": 1,
            "category": "SLA",
            "status": "ready",
            "lifecycleState": "active",
            "processingStage": "indexed",
            "retentionDays": 30,
            "lastIndexedAt": "2026-09-06T10:00:00.000Z",
            "chunkCount": 1,
            "totalTokens": 20,
            "lastSyncedAt": "2026-09-06T10:00:00.000Z",
            "createdAt": "2026-08-15T10:00:00.000Z"
        }
        self.knowledge_sources["ks-tf-2"] = {
            "id": "ks-tf-2",
            "companyId": "comp-techflow",
            "collectionId": "col-tf-2",
            "title": "Refund & Cancellation Policy",
            "sourceType": "faq",
            "fileName": None,
            "fileSizeBytes": 2400,
            "mimeType": "text/plain",
            "version": 1,
            "category": "Billing",
            "status": "ready",
            "lifecycleState": "active",
            "processingStage": "indexed",
            "retentionDays": 30,
            "lastIndexedAt": "2026-09-06T10:00:00.000Z",
            "chunkCount": 1,
            "totalTokens": 15,
            "lastSyncedAt": "2026-09-06T10:00:00.000Z",
            "createdAt": "2026-08-15T10:00:00.000Z"
        }

        # Document Chunks
        self.document_chunks["chk-tf-1"] = {
            "id": "chk-tf-1",
            "knowledgeSourceId": "ks-tf-1",
            "companyId": "comp-techflow",
            "collectionId": "col-tf-1",
            "chunkIndex": 0,
            "content": "TechFlow Cloud guarantees a 99.99% monthly uptime SLA across all multi-region Kubernetes clusters. If uptime falls below 99.99%, enterprise customers are entitled to service credits of 10% to 25% of their monthly bill.",
            "tokenCount": 35,
            "sectionHeader": "SLA & Availability",
            "metadata": {"title": "TechFlow SLA & Uptime Guarantee", "category": "SLA", "fileName": "techflow_sla_2026.pdf", "page": 1}
        }
        self.document_chunks["chk-tf-2"] = {
            "id": "chk-tf-2",
            "knowledgeSourceId": "ks-tf-2",
            "companyId": "comp-techflow",
            "collectionId": "col-tf-2",
            "chunkIndex": 0,
            "content": "Standard refund policy allows a full refund within 14 days of purchase. To initiate a refund, customers must submit an order cancellation request through the portal or speak with support.",
            "tokenCount": 30,
            "sectionHeader": "Refund Window",
            "metadata": {"title": "Refund & Cancellation Policy", "category": "Billing", "faq": True}
        }

        # Knowledge Gaps
        self.knowledge_gaps["gap-tf-1"] = {
            "id": "gap-tf-1",
            "companyId": "comp-techflow",
            "query": "Do you offer on-premise air-gapped deployments?",
            "occurrences": 8,
            "lastAskedAt": "2026-09-06T09:30:00.000Z",
            "status": "unresolved",
            "suggestedCategory": "Deployment",
            "createdAt": "2026-09-05T12:00:00.000Z"
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
            "parameters": [{"name": "order_id", "type": "string", "description": "Order ID", "required": True}]
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
            ]
        }

        self.conversations["conv-tf-101"] = {
            "id": "conv-tf-101",
            "companyId": "comp-techflow",
            "customerSessionId": "sess-99120",
            "customerName": "Rohan Mehta",
            "customerEmail": "rohan@enterprise-client.in",
            "channel": "website_widget",
            "status": "active",
            "sentiment": "neutral",
            "totalTokensUsed": 380,
            "tags": ["Kubernetes", "SLA"],
            "startedAt": "2026-09-01T10:00:00.000Z",
            "lastMessageAt": "2026-09-01T10:05:00.000Z"
        }

        # 2. Apex Health Tenant (Tenant B)
        self.companies["comp-apex-health"] = {
            "id": "comp-apex-health",
            "name": "Apex Health Care",
            "slug": "apex-health",
            "domain": "apexhealth.org",
            "industry": "Healthcare",
            "planId": "growth",
            "billingCycle": "monthly",
            "planStatus": "active",
            "isSuspended": False,
            "apiKey": "aas_live_apex_3381920",
            "apiSecretEncrypted": "enc_kms_sec_apex_prod",
            "createdAt": "2026-08-10T00:00:00.000Z"
        }

        self.users["usr-apex-1"] = {
            "id": "usr-apex-1",
            "email": "dr.sarah@apexhealth.org",
            "passwordHash": hash_password("Password123!"),
            "fullName": "Dr. Sarah Jenkins",
            "isEmailVerified": True,
            "createdAt": "2026-08-10T00:00:00.000Z"
        }
        self.memberships["mem-apex-1"] = {
            "id": "mem-apex-1",
            "userId": "usr-apex-1",
            "companyId": "comp-apex-health",
            "role": "owner",
            "status": "active"
        }

        self.agents["agent-apex-1"] = {
            "id": "agent-apex-1",
            "companyId": "comp-apex-health",
            "name": "CoarAI Clinical Assistant",
            "description": "HIPAA-compliant Patient Support Agent",
            "avatarUrl": "https://images.unsplash.com/photo-1594824813593-35f12e9b8979",
            "status": "active",
            "tone": "empathetic",
            "activeVersionId": "ver-apex-v1",
            "draftVersionId": "ver-apex-v1",
            "createdAt": "2026-08-10T00:00:00.000Z"
        }
        self.agent_versions["ver-apex-v1"] = {
            "id": "ver-apex-v1",
            "agentId": "agent-apex-1",
            "companyId": "comp-apex-health",
            "versionNumber": 1,
            "status": "published",
            "systemInstructions": "You are CoarAI Clinical Assistant, patient triaging assistant for Apex Health.",
            "greetingMessage": "Hello, welcome to Apex Health Telemedicine.",
            "fallbackMessage": "Connecting you to an on-call clinical nurse.",
            "tone": "empathetic",
            "allowedActionIds": [],
            "escalationSettings": {"enabled": True},
            "customSafetyRules": ["Never dispense prescription advice without physician sign-off."],
            "changeSummary": "Initial clinical setup",
            "publishedAt": "2026-08-10T00:00:00.000Z",
            "createdAt": "2026-08-10T00:00:00.000Z"
        }

        # 3. Deployments
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

        # 4. API Keys (Safe Metadata)
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

        # 5. Webhooks
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
            "deliveryHistory": [
                {
                    "id": "del-1",
                    "event": "handoff.triggered",
                    "statusCode": 200,
                    "responseTimeMs": 182,
                    "timestamp": "2 minutes ago",
                    "success": True
                }
            ],
            "createdAt": "2026-08-15T10:00:00.000Z"
        }

    def get_messages_for_conversation(self, conversation_id: str, company_id: str) -> List[Dict[str, Any]]:
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

db = DatabaseStore()
engine = db.engine
SessionLocal = db.SessionLocal
