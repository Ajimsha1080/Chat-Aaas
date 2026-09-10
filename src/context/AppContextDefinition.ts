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
  ToastNotification
} from '../types';

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
  agentVersions: AgentVersionItem[];
  publishAgentVersion: (description?: string) => void;
  rollbackAgentVersion: (versionId: string) => void;

  // Knowledge Management
  knowledgeItems: KnowledgeItem[];
  addKnowledgeItem: (item: Partial<KnowledgeItem> & { title: string; content: string; type: KnowledgeItem['type'] }) => void;
  deleteKnowledgeItem: (id: string) => void;

  // Integrations Management
  integrations: Integration[];
  updateIntegration: (id: string, updates: Partial<Integration>) => void;
  toggleIntegration: (id: string) => void;

  // Actions Management
  actions: ActionDefinition[];
  updateAction: (id: string, updates: Partial<ActionDefinition>) => void;
  toggleAction: (id: string) => void;

  // Developer Features (Webhooks & API Logs)
  webhooks: WebhookEndpoint[];
  createWebhook: (url: string, description: string, events: string[]) => void;
  deleteWebhook: (id: string) => void;
  triggerTestWebhook: (id: string) => Promise<boolean>;
  apiLogs: ApiLogEntry[];

  // Widget & Deployment
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
  startNewCustomerChatSession: (initialGreeting?: boolean) => string;

  // Analytics & Team & Audit
  analytics: AnalyticsSummary;
  auditLogs: AuditLogItem[];
  teamMembers: TeamMember[];
  invoices: Invoice[];
  addTeamMember: (name: string, email: string, role: TeamMember['role']) => void;

  // Super Admin Platform Controls & Health
  systemHealth: SystemHealthMetric[];
  securityEvents: SecurityEventItem[];
  adminToggleCompanySuspension: (companyId: string) => void;
  adminUpdatePlanPrice: (planId: SubscriptionPlanId, monthlyINR: number) => void;

  // Toast System
  toasts: ToastNotification[];
  showToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

