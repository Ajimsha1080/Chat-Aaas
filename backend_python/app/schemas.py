from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime

# Tenant & Identity
class TenantContext(BaseModel):
    company_id: str
    user_id: Optional[str] = None
    role: Literal["owner", "admin", "staff", "super_admin"] = "staff"

# Agent Configuration
class AgentVersionSchema(BaseModel):
    version_id: str
    agent_id: str
    company_id: str
    version_number: int
    system_prompt: str
    greeting: str
    tone: Literal["professional", "friendly", "empathetic", "concise", "technical"]
    temperature: float = 0.3
    max_tokens: int = 1000
    model: str = "gpt-4o"
    status: Literal["draft", "published", "archived"]
    changelog: Optional[str] = None
    created_at: datetime
    published_at: Optional[datetime] = None

class AgentPublishRequest(BaseModel):
    changelog: str = Field(..., min_length=3, description="Release notes for version snapshot")

class AgentRollbackRequest(BaseModel):
    target_version_number: int

# Knowledge & RAG
class KnowledgeIngestRequest(BaseModel):
    type: Literal["url", "doc", "faq", "text"]
    title: str
    content: str
    url: Optional[str] = None
    faq_answer: Optional[str] = None
    category: Optional[str] = "General"

class ChunkSearchResult(BaseModel):
    chunk_id: str
    knowledge_source_id: str
    content: str
    similarity_score: float

class KnowledgeSearchRequest(BaseModel):
    query: str
    top_k: int = 3
    threshold: float = 0.72

# Tools & Business Actions
class ActionParamSchema(BaseModel):
    type: str
    description: str
    required: bool = True

class AgentToolSchema(BaseModel):
    tool_id: str
    company_id: str
    name: str
    description: str
    code: str
    risk_level: Literal["read_only", "low_risk", "high_risk"]
    requires_user_confirmation: bool = False
    enabled: bool = True
    parameters: Dict[str, Any]

class ToolExecutionRequest(BaseModel):
    tool_name: str
    parameters: Dict[str, Any]
    user_confirmed: bool = False

class ToolExecutionResponse(BaseModel):
    success: bool
    requires_confirmation: bool = False
    confirmation_prompt: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# Chat & Streaming
class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: Optional[datetime] = None

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    customer_id: Optional[str] = None
    history: List[ChatMessage] = []
    is_test_mode: bool = False

class ReasoningStep(BaseModel):
    stage: str
    detail: str
    timestamp: str

class ChatResponse(BaseModel):
    message: str
    reasoning_steps: List[ReasoningStep] = []
    tool_executed: Optional[str] = None
    tool_result: Optional[Dict[str, Any]] = None
    requires_confirmation: bool = False
    confirmation_action: Optional[str] = None
    confidence_score: float = 0.95
    is_refusal: bool = False
    handoff_required: bool = False
    session_id: str

# ROI & Analytics
class ROIAnalyticsResponse(BaseModel):
    resolution_rate_percent: float
    escalation_rate_percent: float
    avg_response_time_ms: int
    estimated_hours_saved: float
    estimated_labor_cost_offset_inr: float
    tasks_automated: int
    net_saas_roi_multiplier: float
    unanswered_queries_count: int
