from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime

# Tenant & Identity Context
class TenantContext(BaseModel):
    company_id: str
    user_id: Optional[str] = None
    role: Literal["owner", "admin", "staff", "super_admin", "developer", "viewer"] = "staff"

# 1. Vector Embeddings Pipeline Schemas
class EmbeddingRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, description="List of text chunks to embed")
    model: str = "text-embedding-3-small"
    dimensions: int = 1536
    normalize: bool = True

class EmbeddingItem(BaseModel):
    index: int
    embedding: List[float]
    token_count: int

class EmbeddingResponse(BaseModel):
    success: bool
    model: str
    dimensions: int
    embeddings: List[EmbeddingItem]
    total_tokens: int

# 2. Semantic Cross-Encoder Reranking Schemas
class RerankCandidate(BaseModel):
    id: str
    content: str
    metadata: Optional[Dict[str, Any]] = None
    initial_score: Optional[float] = 0.0

class RerankRequest(BaseModel):
    query: str = Field(..., min_length=1)
    candidates: List[RerankCandidate] = Field(..., min_length=1)
    top_k: int = 5
    min_relevance_threshold: float = 0.55

class RerankResultItem(BaseModel):
    id: str
    content: str
    relevance_score: float
    rank: int
    metadata: Optional[Dict[str, Any]] = None

class RerankResponse(BaseModel):
    success: bool
    query: str
    results: List[RerankResultItem]
    total_candidates: int
    returned_count: int

# 3. RAG Semantic Evaluation & Hallucination Scoring
class EvaluateRequest(BaseModel):
    query: str
    answer: str
    grounding_contexts: List[str]
    company_id: Optional[str] = None

class EvaluateResponse(BaseModel):
    success: bool
    faithfulness_score: float = Field(..., ge=0.0, le=1.0, description="1.0 = 100% grounded in provided context")
    context_recall_score: float = Field(..., ge=0.0, le=1.0)
    hallucination_risk: Literal["low", "medium", "high"]
    is_safe: bool
    reasoning: str
    matched_citations: List[str] = []

# 4. Document Intelligence & Chunking Pipeline
class DocumentProcessRequest(BaseModel):
    title: str
    raw_text: str
    doc_type: Literal["pdf", "docx", "txt", "faq", "url", "markdown"]
    chunk_size: int = 500
    chunk_overlap: int = 50
    metadata: Optional[Dict[str, Any]] = None

class ProcessedChunk(BaseModel):
    chunk_id: str
    chunk_index: int
    content: str
    token_count: int
    section_header: Optional[str] = None

class DocumentProcessResponse(BaseModel):
    success: bool
    title: str
    doc_type: str
    total_chunks: int
    total_tokens: int
    chunks: List[ProcessedChunk]
    cleaned_text_preview: str

# 5. NLP Classification & Intent Detection
class ClassificationRequest(BaseModel):
    text: str
    categories: Optional[List[str]] = None

class ClassificationResponse(BaseModel):
    success: bool
    intent: str
    sentiment: Literal["positive", "neutral", "negative", "urgent"]
    confidence: float
    detected_entities: Dict[str, Any] = {}
    suggested_action: Optional[str] = None

# 6. System Health & Readiness
class HealthResponse(BaseModel):
    status: Literal["healthy", "degraded", "outage"]
    service: str
    version: str
    framework: str
    uptime_seconds: float

class ReadinessResponse(BaseModel):
    ready: bool
    checks: Dict[str, bool]

# Agent Configuration & Versioning
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
    tool_execution: Optional[Dict[str, Any]] = None
    tool_executed: Optional[str] = None
    tool_result: Optional[Dict[str, Any]] = None
    should_escalate_to_human: bool = False
    handoff_required: bool = False
    is_pending_confirmation: bool = False
    requires_confirmation: bool = False
    confirmation_action: Optional[str] = None
    pending_action_data: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float] = 1.0
    is_refusal: bool = False
    session_id: Optional[str] = None
    citations: List[str] = []

class ROIAnalyticsResponse(BaseModel):
    automation_rate_percent: float
    human_handoff_rate_percent: float
    total_conversations: int
    estimated_labor_hours_saved: float
    estimated_cost_savings_inr: float
    customer_satisfaction_score: float
