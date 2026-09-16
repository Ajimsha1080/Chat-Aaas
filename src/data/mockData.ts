import { 
  SubscriptionPlan, 
  Company, 
  KnowledgeItem, 
  Integration, 
  ActionDefinition, 
  Conversation, 
  AuditLogItem, 
  TeamMember, 
  Invoice,
  AnalyticsSummary,
  AgentVersionItem,
  DeploymentItem,
  ApiKeyMetadata,
  WebhookEndpoint,
  ApiLogEntry,
  SystemHealthMetric,
  SecurityEventItem
} from '../types';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthlyINR: 4999,
    priceAnnualINR: 49990,
    description: 'Essential AI assistant for small businesses deploying their first customer agent.',
    agentCount: 1,
    maxConversationsMonth: 1000,
    maxKnowledgeDocs: 10,
    maxIntegrations: 2,
    allowActions: false,
    allowApiDeploy: false,
    allowHumanHandoff: false,
    allowCustomBranding: false,
    prioritySupport: false,
    features: [
      '1 Production AI Agent',
      'Website widget deployment',
      'Up to 10 Knowledge Documents',
      'Basic analytics & conversation history',
      'Up to 1,000 conversations / mo',
      'Standard anti-hallucination guardrails',
      'Community & email support'
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    priceMonthlyINR: 14999,
    priceAnnualINR: 149990,
    badge: 'Most Popular',
    description: 'For scaling teams requiring custom actions, CRM integrations, and semantic reranking.',
    agentCount: 1,
    maxConversationsMonth: 5000,
    maxKnowledgeDocs: 100,
    maxIntegrations: 6,
    allowActions: true,
    allowApiDeploy: true,
    allowHumanHandoff: false,
    allowCustomBranding: true,
    prioritySupport: true,
    features: [
      '1 Production AI Agent',
      'Website + REST API deployment',
      'Up to 5,000 conversations / mo',
      'Up to 100 Knowledge Documents',
      'Custom Action Integrations & Tools',
      'Semantic Cross-Encoder Reranking',
      'Advanced conversation analytics',
      'Priority email & chat support'
    ]
  },
  {
    id: 'business',
    name: 'Enterprise Business',
    priceMonthlyINR: 39999,
    priceAnnualINR: 399990,
    badge: 'Scale',
    description: 'For high-throughput businesses needing human handoff, custom models, and unlimited capacity.',
    agentCount: 1,
    maxConversationsMonth: 25000,
    maxKnowledgeDocs: 500,
    maxIntegrations: 15,
    allowActions: true,
    allowApiDeploy: true,
    allowHumanHandoff: true,
    allowCustomBranding: true,
    prioritySupport: true,
    features: [
      '1 High-Throughput Production AI Agent',
      'Up to 500 Knowledge Documents & Unlimited Chunks',
      'Up to 25,000 conversations / mo',
      'Live Human Operator Takeover & Handoff Inbox',
      'Custom LLM Models & Private Endpoints',
      'Multi-seat RBAC & Full Audit Logging',
      'Dedicated Account Manager & 99.9% Uptime SLA'
    ]
  }
];

// Clean Production Zero-State Defaults (100% Backed by Server Persistence)
export const INITIAL_COMPANIES: Company[] = [];

export const INITIAL_KNOWLEDGE: Record<string, KnowledgeItem[]> = {};

export const INITIAL_INTEGRATIONS: Record<string, Integration[]> = {};

export const INITIAL_ACTIONS: Record<string, ActionDefinition[]> = {};

export const INITIAL_CONVERSATIONS: Record<string, Conversation[]> = {};

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [];

export const INITIAL_TEAM: TeamMember[] = [];

export const INITIAL_INVOICES: Invoice[] = [];

export const INITIAL_ANALYTICS: AnalyticsSummary = {
  dailyConversations: [],
  resolutionRatePercent: 100,
  escalationRatePercent: 0,
  avgResponseTimeMs: 0,
  topQueries: [],
  unansweredQueries: [],
  actionUsageStats: []
};

export const INITIAL_AGENT_VERSIONS: Record<string, AgentVersionItem[]> = {};

export const INITIAL_WEBHOOKS: Record<string, WebhookEndpoint[]> = {};

export const INITIAL_DEPLOYMENTS: Record<string, DeploymentItem[]> = {};

export const INITIAL_API_KEYS: Record<string, ApiKeyMetadata[]> = {};

export const INITIAL_API_LOGS: ApiLogEntry[] = [];

export const INITIAL_SYSTEM_HEALTH: SystemHealthMetric[] = [
  { service: 'Python FastAPI AI Runtime', status: 'operational', uptimePercent: 100.0, latencyMs: 12, lastCheck: 'Active', details: 'Workers active, SSE streaming enabled' },
  { service: 'RAG Hybrid Vector Retrieval', status: 'operational', uptimePercent: 100.0, latencyMs: 20, lastCheck: 'Active', details: 'PostgreSQL pgvector similarity search' },
  { service: 'Multi-Tenant Database Engine', status: 'operational', uptimePercent: 100.0, latencyMs: 4, lastCheck: 'Active', details: 'Multi-tenant isolation enforced' },
  { service: 'KMS AES-256 Encryption', status: 'operational', uptimePercent: 100.0, latencyMs: 1, lastCheck: 'Active', details: 'Storage encryption active' },
  { service: 'SSRF & Ingress Safety Firewall', status: 'operational', uptimePercent: 100.0, latencyMs: 2, lastCheck: 'Active', details: 'Private subnets & cloud metadata blocked' },
  { service: 'LLM Gateway Routing', status: 'operational', uptimePercent: 100.0, latencyMs: 250, lastCheck: 'Active', details: 'Direct multi-model LLM provider routing' }
];

export const INITIAL_SECURITY_EVENTS: SecurityEventItem[] = [];
