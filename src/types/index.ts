export type SubscriptionPlanId = 'starter' | 'growth' | 'business' | 'enterprise';

export interface PlanFeature {
  name: string;
  included: boolean;
  limit?: string;
}

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  priceMonthlyINR: number;
  priceAnnualINR: number;
  badge?: string;
  description: string;
  agentCount: 1; // Strict: ONE agent per company
  maxConversationsMonth: number;
  maxKnowledgeDocs: number;
  maxIntegrations: number;
  allowActions: boolean;
  allowApiDeploy: boolean;
  allowHumanHandoff: boolean;
  allowCustomBranding: boolean;
  prioritySupport: boolean;
  slaPercent?: number;
  features: string[];
}

export type AgentStatus = 'active' | 'paused';

export type AgentTone = 'professional' | 'empathetic' | 'direct' | 'technical' | 'friendly';

export interface EscalationSettings {
  enabled: boolean;
  triggerKeywords: string[];
  maxUnansweredQueriesBeforeEscalation: number;
  notifyEmail: string;
  notifyWebhookUrl?: string;
  escalationMessage: string;
  requireHumanApprovalForRefund: boolean;
}

export interface AgentConfig {
  name: string;
  role?: string;
  goals?: string[];
  status: AgentStatus;
  avatarUrl: string;
  description: string;
  tone: AgentTone;
  modelTier?: 'automatic' | 'fast' | 'balanced' | 'advanced';
  creativityLevel: number; // 0 to 1 (temperature)
  systemInstructions: string;
  businessInstructions: string;
  greetingMessage: string;
  fallbackMessage: string;
  allowedActions: string[]; // action IDs
  escalationSettings: EscalationSettings;
  customSafetyRules: string[];
}

export type KnowledgeType = 'url' | 'document' | 'faq' | 'text';

export type IndexingStatus = 'indexed' | 'indexing' | 'pending' | 'failed';

export interface KnowledgeItem {
  id: string;
  type: KnowledgeType;
  title: string;
  sourceUrl?: string;
  fileName?: string;
  fileSize?: string;
  content: string;
  status: IndexingStatus;
  chunksCount: number;
  tokenCount: number;
  lastUpdated: string;
  articleStatus?: 'published' | 'draft' | 'archived';
  category?: string;
  faqAnswer?: string;
  collectionId?: string;
  collectionName?: string;
}

export interface KnowledgeCollection {
  id: string;
  companyId?: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sourceCount?: number;
  createdAt?: string;
}

export interface KnowledgeGap {
  id: string;
  companyId?: string;
  query: string;
  occurrences: number;
  lastAskedAt: string;
  status: 'unresolved' | 'converted_to_faq' | 'dismissed';
  suggestedCategory?: string;
  createdAt?: string;
}

export interface RagCitation {
  chunkId: string;
  sourceId: string;
  preview: string;
  score: number;
  sourceTitle?: string;
}

export interface RagTestResponse {
  success: boolean;
  answer: string;
  isGrounded: boolean;
  grounded?: boolean;
  citations: RagCitation[];
  confidenceScore: number;
  needsGapRecorded?: boolean;
}


export type IntegrationCategory = 'crm' | 'erp' | 'booking' | 'support' | 'payment' | 'database';

export type AccessPermissionType = 'read_only' | 'action_only' | 'read_and_action';

export interface IntegrationField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  required: boolean;
  value?: string;
  placeholder?: string;
}

export interface Integration {
  id: string;
  name: string;
  provider: string;
  category: IntegrationCategory;
  iconName: string;
  description: string;
  connected: boolean;
  accessType: AccessPermissionType;
  allowedReadScopes: string[];
  allowedActionScopes: string[];
  configFields: IntegrationField[];
  lastSyncAt?: string;
  healthStatus: 'healthy' | 'warning' | 'disconnected';
  encryptedCredentialsKeyId?: string;
}

export type ActionRiskLevel = 'low' | 'medium' | 'high';

export interface ActionParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  description: string;
  required: boolean;
}

export interface ActionDefinition {
  id: string;
  name: string;
  code: string; // e.g. 'book_appointment', 'cancel_order'
  description: string;
  riskLevel: ActionRiskLevel;
  requiresUserConfirmation: boolean;
  confirmationPrompt?: string;
  requiredPermissionScope: string;
  parameters: ActionParam[];
  enabled: boolean;
  integrationProvider?: string;
  successMessageTemplate: string;
  executionCount: number;
}

export type ConversationStatus = 'active' | 'resolved' | 'escalated_to_human' | 'flagged';

export interface ToolExecutionTrace {
  toolName: string;
  arguments: Record<string, any>;
  result: Record<string, any>;
  status: 'pending_confirmation' | 'confirmed' | 'executed' | 'failed' | 'rejected';
  executedAt: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'agent' | 'human_agent' | 'system';
  senderName?: string;
  text: string;
  timestamp: string;
  reasoningSteps?: string[];
  toolTraces?: ToolExecutionTrace[];
  isPendingConfirmation?: boolean;
  pendingActionData?: {
    actionId: string;
    actionName: string;
    params: Record<string, any>;
    prompt: string;
  };
}

export interface Conversation {
  id: string;
  companyId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  channel: 'website_widget' | 'mobile_sdk' | 'api' | 'whatsapp_test';
  startedAt: string;
  lastMessageAt: string;
  status: ConversationStatus;
  messages: Message[];
  assignedOperator?: string;
  sentiment: 'positive' | 'neutral' | 'frustrated' | 'urgent';
  tags: string[];
  resolvedAt?: string;
  totalTokensUsed: number;
}

export interface WidgetCustomization {
  primaryColor: string;
  secondaryColor: string;
  headerTitle: string;
  headerSubtitle: string;
  launcherText: string;
  position: 'bottom_right' | 'bottom_left';
  botAvatar: string;
  userAvatar: string;
  borderRadius: 'rounded-sm' | 'rounded-lg' | 'rounded-2xl' | 'rounded-full';
  showPoweredBy: boolean;
  enableSound: boolean;
  autoExpandSeconds: number; // 0 = disabled
  launcherIcon?: 'chat' | 'chat_dots' | 'chat_lines' | 'help_filled' | 'chat_double' | 'swirl' | 'bot' | 'sparkles' | 'support' | 'help' | 'zap' | 'logo' | 'custom';
  launcherLogoUrl?: string;
  launcherShape?: 'teardrop' | 'circle' | 'squircle' | 'pill';
  themeMode?: 'dark' | 'light';
  headerTextColor?: 'white' | 'black';
  backgroundAnimation?: boolean;
  bottomPadding?: number;
  sidePadding?: number;
  customCss?: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  domain: string;
  industry: string;
  createdAt: string;
  planId: SubscriptionPlanId;
  billingCycle: 'monthly' | 'annual';
  planStatus: 'active' | 'trialing' | 'past_due' | 'suspended';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  agent: AgentConfig;
  widgetSettings: WidgetCustomization;
  apiKey: string;
  apiSecretMasked: string;
  webhookUrl?: string;
  isSuspended: boolean;
  stats: {
    totalConversations: number;
    totalMessages: number;
    resolvedConversations: number;
    escalatedConversations: number;
    messagesThisMonth: number;
    tokensThisMonth: number;
    knowledgeChunksUsed: number;
  };
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  details: string;
  ipAddress: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'support_agent' | 'viewer';
  status: 'active' | 'invited';
  lastActive: string;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  amountINR: number;
  planName: string;
  status: 'paid' | 'pending' | 'failed';
  downloadUrl?: string;
}

export interface AnalyticsSummary {
  dailyConversations: { date: string; conversations: number; messages: number; resolutions: number }[];
  resolutionRatePercent: number;
  escalationRatePercent: number;
  avgResponseTimeMs: number;
  topQueries: { query: string; count: number; category: string }[];
  unansweredQueries: { query: string; occurrences: number; lastAsked: string; status: 'pending' | 'added_to_kb' }[];
  actionUsageStats: { actionName: string; executions: number; successRate: number }[];
}

export type ProductExperience = 'customer' | 'admin' | 'developer';

export type UserRole = 
  | 'platform_super_admin' 
  | 'platform_admin' 
  | 'owner' 
  | 'admin' 
  | 'manager' 
  | 'staff' 
  | 'developer' 
  | 'viewer';

export type AdminNavigationTab = 
  | 'overview' 
  | 'organizations' 
  | 'agents' 
  | 'subscriptions' 
  | 'revenue' 
  | 'usage' 
  | 'support' 
  | 'health' 
  | 'security' 
  | 'audit' 
  | 'settings';

export type DeveloperNavigationTab = 
  | 'api-keys' 
  | 'webhooks' 
  | 'api-logs' 
  | 'integrations' 
  | 'agent-versions' 
  | 'advanced-ai' 
  | 'dev-tools';

export type NavigationTab = 
  | 'home'
  | 'assistant'
  | 'conversations' 
  | 'knowledge' 
  | 'connections' 
  | 'deploy' 
  | 'insights' 
  | 'billing' 
  | 'settings'
  | 'overview' 
  | 'actions' 
  | 'channels' 
  | 'analytics';

export interface AgentVersionItem {
  id: string;
  version: number;
  versionLabel: string;
  status: 'live' | 'draft' | 'archived';
  createdAt: string;
  publishedAt?: string;
  author: string;
  description: string;
  snapshot: {
    name: string;
    role: string;
    tone: AgentTone;
    modelTier: 'automatic' | 'fast' | 'balanced' | 'advanced';
    creativityLevel: number;
    systemInstructions: string;
    allowedActionsCount: number;
    knowledgeItemCount: number;
  };
  diffSummary?: string[];
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  description: string;
  events: string[];
  secret: string;
  status: 'active' | 'failing' | 'disabled';
  createdAt: string;
  lastDeliveredAt?: string;
  successRatePercent: number;
}

export interface ApiLogEntry {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  statusCode: number;
  durationMs: number;
  ipAddress: string;
  apiKeyPreview: string;
  requestBodyMasked?: string;
  responseBodyPreview?: string;
}

export interface SystemHealthMetric {
  service: string;
  status: 'operational' | 'degraded' | 'outage';
  uptimePercent: number;
  latencyMs: number;
  lastCheck: string;
  details?: string;
}

export interface SecurityEventItem {
  id: string;
  timestamp: string;
  type: 'ssrf_blocked' | 'rate_limit_exceeded' | 'invalid_auth' | 'kms_rotation' | 'suspicious_ip';
  severity: 'low' | 'medium' | 'high' | 'critical';
  sourceIp: string;
  description: string;
  actionTaken: string;
}

export interface ToastNotification {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'info' | 'warning' | 'error';
}


