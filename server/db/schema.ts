/**
 * Agent-as-a-Service (AaaS) Database Schema Definition
 * 
 * Strict Multi-Tenant Normalized Relational Architecture
 * Entity models with tenant isolation, foreign keys, timestamps, and indexing.
 */

export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  mfaSecret?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CompanyEntity {
  id: string;
  name: string;
  slug: string;
  domain: string;
  industry: string;
  planId: 'starter' | 'growth' | 'business' | 'enterprise';
  billingCycle: 'monthly' | 'annual';
  planStatus: 'active' | 'past_due' | 'cancelled' | 'suspended';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  isSuspended: boolean;
  apiKey: string;
  apiSecretEncrypted: string;
  webhookUrl?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface MembershipEntity {
  id: string;
  userId: string;
  companyId: string;
  role: 'owner' | 'admin' | 'staff' | 'super_admin';
  status: 'active' | 'invited' | 'disabled';
  invitedEmail?: string;
  invitedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentEntity {
  id: string;
  companyId: string; // STRICT 1 COMPANY = 1 AGENT UNIQUE CONSTRAINT
  name: string;
  description: string;
  avatarUrl: string;
  status: 'active' | 'paused' | 'drafting';
  tone: 'professional' | 'empathetic' | 'technical' | 'friendly' | 'direct';
  activeVersionId: string;
  draftVersionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentVersionEntity {
  id: string;
  agentId: string;
  companyId: string;
  versionNumber: number;
  status: 'published' | 'draft' | 'archived';
  systemInstructions: string;
  businessInstructions: string;
  greetingMessage: string;
  fallbackMessage: string;
  tone: 'professional' | 'empathetic' | 'technical' | 'friendly' | 'direct';
  allowedActionIds: string[];
  escalationSettings: {
    enabled: boolean;
    triggerKeywords: string[];
    maxUnansweredQueriesBeforeEscalation: number;
    notifyEmail: string;
    escalationMessage: string;
    requireHumanApprovalForRefund: boolean;
  };
  customSafetyRules: string[];
  changeSummary?: string;
  publishedByUserId?: string;
  publishedAt?: string;
  createdAt: string;
}

export interface KnowledgeSourceEntity {
  id: string;
  companyId: string;
  type: 'url' | 'document' | 'faq' | 'text';
  title: string;
  sourceUrl?: string;
  fileName?: string;
  fileSize?: string;
  category: string;
  status: 'pending' | 'processing' | 'indexed' | 'failed';
  errorMessage?: string;
  rawContent: string;
  chunksCount: number;
  tokenCount: number;
  lastIndexedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface DocumentChunkEntity {
  id: string;
  knowledgeSourceId: string;
  companyId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  embeddingVector?: number[];
  metadata: {
    title: string;
    sourceType: string;
    category: string;
    sourceUrl?: string;
  };
  createdAt: string;
}

export interface IntegrationEntity {
  id: string;
  companyId: string;
  name: string;
  provider: 'salesforce' | 'hubspot' | 'zendesk' | 'stripe' | 'postgres' | 'calendly';
  category: 'crm' | 'support' | 'payment' | 'database' | 'booking';
  description: string;
  connected: boolean;
  healthStatus: 'healthy' | 'warning' | 'error' | 'disconnected';
  accessType: 'read_only' | 'read_and_action' | 'action_only';
  allowedReadScopes: string[];
  allowedActionScopes: string[];
  credentialsEncrypted: string;
  configFields: { key: string; label: string; value?: string; type: string }[];
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentToolEntity {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  requiresUserConfirmation: boolean;
  confirmationPrompt?: string;
  successMessageTemplate: string;
  integrationProvider?: string;
  enabled: boolean;
  parameters: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    description: string;
    required: boolean;
    defaultValue?: any;
  }[];
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationEntity {
  id: string;
  companyId: string;
  customerSessionId: string;
  customerName: string;
  customerEmail: string;
  channel: 'website_widget' | 'mobile_api' | 'web_app' | 'test_sandbox';
  status: 'active' | 'resolved' | 'escalated_to_human';
  sentiment: 'positive' | 'neutral' | 'urgent';
  assignedOperator?: string;
  totalTokensUsed: number;
  tags: string[];
  startedAt: string;
  lastMessageAt: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageEntity {
  id: string;
  conversationId: string;
  companyId: string;
  sender: 'user' | 'agent' | 'human_agent' | 'system';
  senderName?: string;
  text: string;
  reasoningSteps?: string[];
  toolTraces?: {
    toolName: string;
    arguments: Record<string, any>;
    status: 'success' | 'failed';
    output: any;
    executionTimeMs: number;
  }[];
  isPendingConfirmation?: boolean;
  pendingActionData?: {
    actionId: string;
    actionName: string;
    params: Record<string, any>;
    riskLevel: 'low' | 'medium' | 'high';
  };
  tokensUsed?: number;
  createdAt: string;
}

export interface UsageEventEntity {
  id: string;
  companyId: string;
  conversationId?: string;
  eventType: 'message' | 'token_consumption' | 'tool_call' | 'rag_query' | 'vector_storage';
  quantity: number;
  unit: 'count' | 'tokens' | 'chunks';
  model?: string;
  timestamp: string;
}

export interface SubscriptionEntity {
  id: string;
  companyId: string;
  planId: 'starter' | 'growth' | 'business' | 'enterprise';
  billingCycle: 'monthly' | 'annual';
  status: 'active' | 'past_due' | 'cancelled';
  priceINR: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  paymentGatewayProvider: 'razorpay' | 'stripe';
  externalSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceEntity {
  id: string;
  companyId: string;
  invoiceNumber: string;
  date: string;
  amountINR: number;
  planName: string;
  status: 'paid' | 'pending' | 'failed';
  pdfReceiptUrl?: string;
  gstin?: string;
  taxAmountINR: number;
  createdAt: string;
}

export interface DeploymentConfigEntity {
  id: string;
  companyId: string;
  publicWidgetToken: string;
  primaryColor: string;
  secondaryColor: string;
  headerTitle: string;
  headerSubtitle: string;
  launcherText: string;
  position: 'bottom_right' | 'bottom_left';
  botAvatar: string;
  userAvatar: string;
  borderRadius: string;
  showPoweredBy: boolean;
  enableSound: boolean;
  autoExpandSeconds: number;
  allowedDomains: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntity {
  id: string;
  companyId: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  details: string;
  ipAddress: string;
  severity: 'info' | 'warning' | 'critical';
  correlationId?: string;
}
