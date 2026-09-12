import { createContext } from 'react';
import { 
  Company, 
  SubscriptionPlan, 
  KnowledgeItem, 
  Integration, 
  ActionDefinition, 
  Conversation, 
  AuditLogItem, 
  TeamMember, 
  Invoice, 
  AnalyticsSummary, 
  NavigationTab,
  AdminNavigationTab,
  DeveloperNavigationTab,
  ProductExperience,
  UserRole,
  AgentVersionItem,
  WebhookEndpoint,
  ApiLogEntry,
  SystemHealthMetric,
  SecurityEventItem,
  SubscriptionPlanId,
  AgentConfig,
  WidgetCustomization,
  AgentTone,
  ToastNotification,
  DeploymentItem,
  ApiKeyMetadata
} from '../types';
import { INITIAL_COMPANIES } from '../data/mockData';

const defaultStats = {
  totalConversations: 124,
  totalMessages: 890,
  resolvedConversations: 110,
  escalatedConversations: 14,
  messagesThisMonth: 340,
  tokensThisMonth: 12500,
  knowledgeChunksUsed: 42
};

const defaultAgent: AgentConfig = {
  name: 'AI Assistant',
  status: 'active',
  avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
  description: 'AI Support Specialist',
  tone: 'professional',
  creativityLevel: 0.3,
  systemInstructions: 'Assist users accurately.',
  businessInstructions: 'Be polite and helpful.',
  greetingMessage: 'Hello! How can I help you today?',
  fallbackMessage: 'I do not have verified knowledge on this topic.',
  allowedActions: [],
  escalationSettings: {
    enabled: true,
    triggerKeywords: ['human', 'agent', 'support'],
    maxUnansweredQueriesBeforeEscalation: 2,
    notifyEmail: 'support@company.com',
    escalationMessage: 'Connecting you to a team member.',
    requireHumanApprovalForRefund: true
  },
  customSafetyRules: []
};

const defaultWidgetSettings: WidgetCustomization = {
  primaryColor: '#4f46e5',
  secondaryColor: '#6366f1',
  headerTitle: 'Customer Support',
  headerSubtitle: 'We usually reply in a few seconds',
  launcherText: 'Chat with us',
  position: 'bottom_right',
  botAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
  userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
  borderRadius: 'rounded-2xl',
  showPoweredBy: true,
  enableSound: true,
  autoExpandSeconds: 0
};

export const normalizeCompany = (c: any): Company => {
  if (!c) return INITIAL_COMPANIES[0];
  return {
    ...c,
    id: c.id || 'comp-default',
    name: c.name || 'Workspace',
    slug: c.slug || 'workspace',
    domain: c.domain || 'example.com',
    industry: c.industry || 'Technology',
    planId: c.planId || 'growth',
    billingCycle: c.billingCycle || 'monthly',
    planStatus: c.planStatus || 'active',
    agent: { ...defaultAgent, ...(c.agent || {}) },
    widgetSettings: { ...defaultWidgetSettings, ...(c.widgetSettings || {}) },
    apiKey: c.apiKey || 'aas_live_default',
    apiSecretMasked: c.apiSecretMasked || '••••••••••••',
    isSuspended: Boolean(c.isSuspended),
    stats: { ...defaultStats, ...(c.stats || {}) }
  };
};

export const normalizeConversation = (c: any): Conversation => {
  if (!c) return {
    id: 'conv-default',
    companyId: 'comp-techflow',
    customerName: 'Website Visitor',
    channel: 'website_widget',
    startedAt: new Date().toISOString(),
    lastMessageAt: new Date().toISOString(),
    status: 'active',
    messages: [],
    sentiment: 'neutral',
    tags: ['Live Session'],
    totalTokensUsed: 100
  };

  return {
    ...c,
    id: c.id || 'conv-default',
    companyId: c.companyId || 'comp-default',
    customerName: c.customerName || 'Website Visitor',
    channel: c.channel || 'website_widget',
    startedAt: c.startedAt || new Date().toISOString(),
    lastMessageAt: c.lastMessageAt || new Date().toISOString(),
    status: c.status || 'active',
    messages: Array.isArray(c.messages) ? c.messages : [],
    sentiment: c.sentiment || 'neutral',
    tags: Array.isArray(c.tags) ? c.tags : ['Live Session'],
    totalTokensUsed: c.totalTokensUsed || 0
  };
};

export const normalizeKnowledgeItem = (k: any): KnowledgeItem => {
  if (!k) return {
    id: 'kb-default',
    type: 'document',
    title: 'Untitled Document',
    content: '',
    status: 'indexed',
    lifecycleState: 'active',
    processingStage: 'indexed',
    chunksCount: 1,
    tokenCount: 100,
    lastUpdated: new Date().toISOString()
  };

  return {
    ...k,
    id: k.id || 'kb-default',
    type: k.type || 'document',
    title: k.title || 'Untitled Document',
    content: k.content || '',
    status: k.status || 'indexed',
    lifecycleState: k.lifecycleState || 'active',
    processingStage: k.processingStage || 'indexed',
    chunksCount: k.chunksCount || 1,
    tokenCount: k.tokenCount || 100,
    lastUpdated: k.lastUpdated || new Date().toISOString()
  };
};

export interface AppContextType {
  // Navigation & Product Experiences
  currentExperience: ProductExperience;
  setCurrentExperience: (exp: ProductExperience) => void;
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  currentAdminTab: AdminNavigationTab;
  setCurrentAdminTab: (tab: AdminNavigationTab) => void;
  currentDevTab: DeveloperNavigationTab;
  setCurrentDevTab: (tab: DeveloperNavigationTab) => void;
  
  isAdminMode: boolean; // backward compat
  setIsAdminMode: (admin: boolean) => void;
  isLiveSandboxOpen: boolean;
  setIsLiveSandboxOpen: (open: boolean) => void;
  isQuickTestOpen: boolean;
  setIsQuickTestOpen: (open: boolean) => void;
  currentUserRole: UserRole;
  setCurrentUserRole: (role: UserRole) => void;

  // Company State
  companies: Company[];
  currentCompanyId: string;
  currentCompany: Company;
  switchCompany: (companyId: string) => void;
  updateCompany: (updates: Partial<Company>) => void;
  createCompanyWorkspace: (
    name: string, 
    domain: string, 
    industry: string, 
    planId: SubscriptionPlanId, 
    agentName: string, 
    tone: AgentTone
  ) => string;

  // Plans
  allPlans: SubscriptionPlan[];
  currentPlan: SubscriptionPlan;
  upgradeSubscription: (planId: SubscriptionPlanId, cycle: 'monthly' | 'annual') => void;

  // Single Agent Management & Versioning
  updateAgentConfig: (updates: Partial<AgentConfig>) => void;
  toggleAgentStatus: () => void;
  unpublishAgent: () => Promise<void>;
  disableAgent: () => Promise<void>;
  enableAgent: () => Promise<void>;
  archiveAgent: () => Promise<void>;
  deleteAgent: () => Promise<void>;
  agentVersions: AgentVersionItem[];
  publishAgentVersion: (description?: string) => void;
  rollbackAgentVersion: (versionId: string) => void;

  // Knowledge Management & Lifecycle
  knowledgeItems: KnowledgeItem[];
  addKnowledgeItem: (item: Partial<KnowledgeItem> & { title: string; content: string; type: KnowledgeItem['type'] }) => void;
  deleteKnowledgeItem: (id: string) => void;
  trashKnowledgeItem: (id: string) => Promise<void>;
  restoreKnowledgeItem: (id: string) => Promise<void>;
  disableKnowledgeItem: (id: string) => Promise<void>;
  enableKnowledgeItem: (id: string) => Promise<void>;
  reprocessKnowledgeItem: (id: string) => Promise<void>;
  permanentDeleteKnowledgeItem: (id: string) => Promise<void>;
  bulkTrashKnowledge: (ids: string[]) => Promise<void>;
  bulkDisableKnowledge: (ids: string[]) => Promise<void>;

  // Integrations Management
  integrations: Integration[];
  updateIntegration: (id: string, updates: Partial<Integration>) => void;
  toggleIntegration: (id: string) => void;

  // Actions Management
  actions: ActionDefinition[];
  updateAction: (id: string, updates: Partial<ActionDefinition>) => void;
  toggleAction: (id: string) => void;

  // Developer Features (Webhooks & API Keys & API Logs)
  apiKeys: ApiKeyMetadata[];
  createApiKey: (name: string, scopes?: string[]) => Promise<{ rawSecret: string } | null>;
  rotateApiKey: (id: string) => Promise<{ rawSecret: string } | null>;
  revokeApiKey: (id: string) => Promise<void>;
  webhooks: WebhookEndpoint[];
  createWebhook: (url: string, description: string, events: string[]) => void;
  toggleWebhook: (id: string) => Promise<void>;
  deleteWebhook: (id: string) => void;
  triggerTestWebhook: (id: string) => Promise<boolean>;
  apiLogs: ApiLogEntry[];

  // Widget & Deployments
  deployments: DeploymentItem[];
  createDeployment: (name: string, channel: DeploymentItem['channel'], domain?: string) => Promise<void>;
  disableDeployment: (id: string) => Promise<void>;
  enableDeployment: (id: string) => Promise<void>;
  removeDeployment: (id: string) => Promise<void>;
  updateWidgetSettings: (updates: Partial<WidgetCustomization>) => void;
  regenerateApiKey: () => void;

  // Conversations & Messaging
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  currentActiveConversation: Conversation | null;
  sendMessageToAgent: (conversationId: string, text: string) => Promise<void>;
  confirmPendingAction: (conversationId: string, messageId: string, confirmed: boolean) => Promise<void>;
  takeoverConversation: (conversationId: string, operatorName?: string, internalNote?: string) => void;
  sendOperatorMessage: (conversationId: string, text: string) => void;
  resolveConversation: (conversationId: string) => void;
  archiveConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  bulkArchiveConversations: (ids: string[]) => Promise<void>;
  bulkDeleteConversations: (ids: string[]) => Promise<void>;
  startNewCustomerChatSession: (initialGreeting?: boolean) => string;

  // Analytics & Team & Audit
  analytics: AnalyticsSummary;
  auditLogs: AuditLogItem[];
  teamMembers: TeamMember[];
  invoices: Invoice[];
  addTeamMember: (name: string, email: string, role: TeamMember['role']) => void;
  currentUserProfile: { id: string; fullName: string; email: string; role: string; avatarUrl?: string } | null;
  updateCurrentUserProfile: (fullName: string, avatarUrl?: string) => Promise<void>;

  // Super Admin Platform Controls & Health
  systemHealth: SystemHealthMetric[];
  securityEvents: SecurityEventItem[];
  adminToggleCompanySuspension: (companyId: string) => void;
  adminUpdatePlanPrice: (planId: SubscriptionPlanId, monthlyINR: number) => void;
  isImpersonating: boolean;
  impersonatedCompanyName: string | null;
  startImpersonation: (companyId: string, companyName: string, token: string) => void;
  stopImpersonation: () => void;

  // Toast System
  toasts: ToastNotification[];
  showToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

