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
  SubscriptionPlanId,
  AgentConfig,
  WidgetCustomization,
  AgentTone,
  ToastNotification
} from '../types';

export interface AppContextType {
  // Navigation & Modes
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  isAdminMode: boolean;
  setIsAdminMode: (admin: boolean) => void;
  isLiveSandboxOpen: boolean;
  setIsLiveSandboxOpen: (open: boolean) => void;
  isQuickTestOpen: boolean;
  setIsQuickTestOpen: (open: boolean) => void;
  currentUserRole: 'owner' | 'admin' | 'support_agent' | 'platform_super_admin';
  setCurrentUserRole: (role: 'owner' | 'admin' | 'support_agent' | 'platform_super_admin') => void;

  // Company State
  companies: Company[];
  currentCompanyId: string;
  currentCompany: Company;
  switchCompany: (companyId: string) => void;
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

  // Single Agent Management
  updateAgentConfig: (updates: Partial<AgentConfig>) => void;
  toggleAgentStatus: () => void;

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
  takeoverConversation: (conversationId: string, operatorName?: string) => void;
  sendOperatorMessage: (conversationId: string, text: string) => void;
  resolveConversation: (conversationId: string) => void;
  startNewCustomerChatSession: (initialGreeting?: boolean) => string;

  // Analytics & Team & Audit
  analytics: AnalyticsSummary;
  auditLogs: AuditLogItem[];
  teamMembers: TeamMember[];
  invoices: Invoice[];
  addTeamMember: (name: string, email: string, role: TeamMember['role']) => void;

  // Super Admin Platform Controls
  adminToggleCompanySuspension: (companyId: string) => void;
  adminUpdatePlanPrice: (planId: SubscriptionPlanId, monthlyINR: number) => void;

  // Toast System
  toasts: ToastNotification[];
  showToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
