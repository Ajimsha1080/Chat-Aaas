import time
from typing import Dict, Any, List, Optional
from app.core.security import hash_password

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
        self._seed_initial_data()

    def _seed_initial_data(self):
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

        self.users["usr-alex"] = {
            "id": "usr-alex",
            "email": "alex@techflow.io",
            "passwordHash": hash_password("Password123!"),
            "fullName": "Alex Vance",
            "isEmailVerified": True,
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

    def get_messages_for_conversation(self, conversation_id: str, company_id: str) -> List[Dict[str, Any]]:
        return [m for m in self.messages.values() if m.get("conversationId") == conversation_id and m.get("companyId") == company_id]

    def get_document_chunks_for_tenant(self, company_id: str) -> List[Dict[str, Any]]:
        return [c for c in self.document_chunks.values() if c.get("companyId") == company_id]

    def get_collections_for_tenant(self, company_id: str) -> List[Dict[str, Any]]:
        return [c for c in self.knowledge_collections.values() if c.get("companyId") == company_id]

    def get_knowledge_sources_for_tenant(
        self, 
        company_id: str, 
        collection_id: Optional[str] = None,
        source_type: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        sources = [s for s in self.knowledge_sources.values() if s.get("companyId") == company_id]
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
        return None

db = DatabaseStore()

