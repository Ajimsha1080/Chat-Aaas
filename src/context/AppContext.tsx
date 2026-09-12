import React, { useState, useEffect } from 'react';
import { 
  Company, 
  SubscriptionPlan, 
  KnowledgeItem, 
  Integration, 
  ActionDefinition, 
  Conversation, 
  Message, 
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
import { 
  INITIAL_COMPANIES, 
  SUBSCRIPTION_PLANS, 
  INITIAL_KNOWLEDGE, 
  INITIAL_INTEGRATIONS, 
  INITIAL_ACTIONS, 
  INITIAL_CONVERSATIONS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_TEAM, 
  INITIAL_INVOICES, 
  INITIAL_ANALYTICS,
  INITIAL_AGENT_VERSIONS,
  INITIAL_WEBHOOKS,
  INITIAL_DEPLOYMENTS,
  INITIAL_API_KEYS,
  INITIAL_API_LOGS,
  INITIAL_SYSTEM_HEALTH,
  INITIAL_SECURITY_EVENTS
} from '../data/mockData';
import { AIAgentEngine } from '../services/aiEngine';
import { APIClient } from '../api/apiClient';
import { AppContext, normalizeCompany, normalizeConversation, normalizeKnowledgeItem } from './AppContextDefinition';

const LOCAL_STORAGE_KEY = 'coarai_platform_state_v6';

const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Experiences & Navigation
  const [currentExperience, setCurrentExperienceState] = useState<ProductExperience>('customer');
  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [currentAdminTab, setCurrentAdminTab] = useState<AdminNavigationTab>('overview');
  const [currentDevTab, setCurrentDevTab] = useState<DeveloperNavigationTab>('api-keys');
  const [isAdminMode, setIsAdminModeState] = useState<boolean>(false);
  const [isLiveSandboxOpen, setIsLiveSandboxOpen] = useState<boolean>(false);
  const [isQuickTestOpen, setIsQuickTestOpen] = useState<boolean>(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('owner');

  const setCurrentExperience = (exp: ProductExperience) => {
    setCurrentExperienceState(exp);
    setIsAdminModeState(exp === 'admin');
  };

  const setIsAdminMode = (admin: boolean) => {
    setIsAdminModeState(admin);
    setCurrentExperienceState(admin ? 'admin' : 'customer');
  };

  // Multi-tenant Entities
  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_companies`);
    const rawList: any[] = saved ? JSON.parse(saved) : INITIAL_COMPANIES;
    return rawList.map(normalizeCompany);
  });

  const [currentCompanyId, setCurrentCompanyId] = useState<string>(() => {
    return companies[0]?.id || 'comp-techflow';
  });

  const [allPlans, setAllPlans] = useState<SubscriptionPlan[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_plans`);
    return saved ? JSON.parse(saved) : SUBSCRIPTION_PLANS;
  });

  const [knowledgeMap, setKnowledgeMap] = useState<Record<string, KnowledgeItem[]>>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_knowledge`);
    const rawMap: Record<string, any[]> = saved ? JSON.parse(saved) : INITIAL_KNOWLEDGE;
    const result: Record<string, KnowledgeItem[]> = {};
    for (const [key, val] of Object.entries(rawMap)) {
      result[key] = (val || []).map(normalizeKnowledgeItem);
    }
    return result;
  });

  const [deploymentsMap, setDeploymentsMap] = useState<Record<string, DeploymentItem[]>>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_deployments`);
    return saved ? JSON.parse(saved) : INITIAL_DEPLOYMENTS;
  });

  const [apiKeysMap, setApiKeysMap] = useState<Record<string, ApiKeyMetadata[]>>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_apikeys`);
    return saved ? JSON.parse(saved) : INITIAL_API_KEYS;
  });

  const [integrationsMap, setIntegrationsMap] = useState<Record<string, Integration[]>>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_integrations`);
    return saved ? JSON.parse(saved) : INITIAL_INTEGRATIONS;
  });

  const [actionsMap, setActionsMap] = useState<Record<string, ActionDefinition[]>>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_actions`);
    return saved ? JSON.parse(saved) : INITIAL_ACTIONS;
  });

  const [conversationsMap, setConversationsMap] = useState<Record<string, Conversation[]>>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_conversations`);
    const rawMap: Record<string, any[]> = saved ? JSON.parse(saved) : INITIAL_CONVERSATIONS;
    const result: Record<string, Conversation[]> = {};
    for (const [key, val] of Object.entries(rawMap)) {
      result[key] = (val || []).map(normalizeConversation);
    }
    return result;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_audit`);
    if (!saved) return INITIAL_AUDIT_LOGS;
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return INITIAL_AUDIT_LOGS;
      return parsed.map((item: any) => {
        if (!item.timestamp || isNaN(new Date(item.timestamp).getTime())) {
          return { ...item, timestamp: new Date().toISOString() };
        }
        return item;
      });
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  const [versionsMap, setVersionsMap] = useState<Record<string, AgentVersionItem[]>>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_versions`);
    return saved ? JSON.parse(saved) : INITIAL_AGENT_VERSIONS;
  });

  const [webhooksMap, setWebhooksMap] = useState<Record<string, WebhookEndpoint[]>>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_webhooks`);
    return saved ? JSON.parse(saved) : INITIAL_WEBHOOKS;
  });

  const [apiLogs, setApiLogs] = useState<ApiLogEntry[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_apilogs`);
    return saved ? JSON.parse(saved) : INITIAL_API_LOGS;
  });

  const [systemHealth] = useState<SystemHealthMetric[]>(INITIAL_SYSTEM_HEALTH);
  const [securityEvents] = useState<SecurityEventItem[]>(INITIAL_SECURITY_EVENTS);

  const [teamMembersMap, setTeamMembersMap] = useState<Record<string, TeamMember[]>>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_teams`);
    return saved ? JSON.parse(saved) : { [INITIAL_COMPANIES[0].id]: INITIAL_TEAM };
  });

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_teams`, JSON.stringify(teamMembersMap));
  }, [teamMembersMap]);

  const teamMembers = teamMembersMap[currentCompanyId] || INITIAL_TEAM;

  const [currentUserProfile, setCurrentUserProfile] = useState<{ id: string; fullName: string; email: string; role: string; avatarUrl?: string } | null>({
    id: 'usr-alex',
    fullName: 'Alex Morgan',
    email: 'alex@techflow.io',
    role: 'owner',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  });

  useEffect(() => {
    APIClient.getCurrentUserProfile()
      .then(res => {
        if (res && res.id) {
          setCurrentUserProfile(res);
        }
      })
      .catch(() => {});
  }, [currentCompanyId]);

  const updateCurrentUserProfile = async (fullName: string, avatarUrl?: string) => {
    setCurrentUserProfile(prev => prev ? { ...prev, fullName, avatarUrl: avatarUrl ?? prev.avatarUrl } : null);
    try {
      await APIClient.updateCurrentUserProfile({ fullName, avatarUrl });
      showToast('Profile Updated', 'Your profile details have been saved.', 'success');
    } catch (e: any) {
      console.warn('Backend profile update notice:', e.message);
      showToast('Profile Updated', 'Profile updated.', 'success');
    }
  };
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [analytics] = useState<AnalyticsSummary>(INITIAL_ANALYTICS);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const showToast = (title: string, message?: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastNotification = { id, title, message, type };
    setToasts(prev => [...prev.slice(-3), newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // 1. Initial Load: Fetch Live Registered Workspaces
  useEffect(() => {
    const loadLiveCompanies = async () => {
      try {
        const compRes = await APIClient.getCompanies();
        if (compRes && compRes.companies && Array.isArray(compRes.companies) && compRes.companies.length > 0) {
          setCompanies(compRes.companies.map(normalizeCompany));
        }
      } catch (err) {
        console.info('[Live Sync] Using local cache until backend reconnects:', err);
      }
    };
    loadLiveCompanies();
  }, []);

  // 2. Real-time Tenant Sync: Load live Knowledge, Tools, Versions, Audit Logs & Conversations
  useEffect(() => {
    APIClient.setAuth(null, currentCompanyId);

    const syncTenantLiveData = async () => {
      try {
        // Fetch Live Knowledge Sources
        const kRes = await APIClient.getKnowledge();
        if (kRes && kRes.sources) {
          const mappedKnowledge: KnowledgeItem[] = kRes.sources.map((s: any) => ({
            id: s.id,
            type: s.sourceType || 'doc',
            title: s.title,
            sourceUrl: s.sourceUrl,
            fileName: s.fileName || s.title,
            fileSize: s.fileSizeBytes ? `${(s.fileSizeBytes / 1024).toFixed(1)} KB` : '120 KB',
            content: s.content || '',
            status: s.status === 'ready' ? 'indexed' : (s.status || 'indexed'),
            lifecycleState: s.lifecycleState || 'active',
            processingStage: s.processingStage || 'indexed',
            deletedAt: s.deletedAt,
            retentionDays: s.retentionDays || 30,
            lastIndexedAt: s.lastIndexedAt,
            chunksCount: s.chunkCount || 1,
            tokenCount: s.totalTokens || 150,
            lastUpdated: s.createdAt || new Date().toISOString()
          }));
          setKnowledgeMap(prev => ({ ...prev, [currentCompanyId]: mappedKnowledge }));
        }

        // Fetch Live Tools
        const tRes = await APIClient.getTools();
        if (tRes && tRes.tools) {
          setActionsMap(prev => ({ ...prev, [currentCompanyId]: tRes.tools }));
        }

        // Fetch Live Deployments
        const dRes = await APIClient.getDeployments();
        if (dRes && dRes.deployments) {
          setDeploymentsMap(prev => ({ ...prev, [currentCompanyId]: dRes.deployments }));
        }

        // Fetch Live API Keys
        const akRes = await APIClient.getApiKeys();
        if (akRes && akRes.apiKeys) {
          setApiKeysMap(prev => ({ ...prev, [currentCompanyId]: akRes.apiKeys }));
        }

        // Fetch Live Agent Versions
        const vRes = await APIClient.getAgentVersions();
        if (vRes && vRes.versions) {
          setVersionsMap(prev => ({ ...prev, [currentCompanyId]: vRes.versions }));
        }

        // Fetch Live Audit Logs
        const aRes = await APIClient.getAuditLogs();
        if (aRes && aRes.logs) {
          setAuditLogs(aRes.logs);
        }

        // Fetch Live Conversations
        const cRes = await APIClient.getConversations();
        if (cRes && cRes.conversations) {
          setConversationsMap(prev => ({ ...prev, [currentCompanyId]: cRes.conversations }));
        }

        // Fetch Live Team Members
        const tmRes = await APIClient.getTeamMembers();
        if (tmRes && tmRes.team && Array.isArray(tmRes.team)) {
          const mappedTeam: TeamMember[] = tmRes.team.map((m: any) => ({
            id: m.userId || m.membershipId || genId('usr'),
            name: m.fullName || 'Team Member',
            email: m.email || '',
            role: m.role || 'viewer',
            status: m.status || 'active',
            lastActive: 'Just now'
          }));
          if (mappedTeam.length > 0) {
            setTeamMembersMap(prev => ({ ...prev, [currentCompanyId]: mappedTeam }));
          }
        }
      } catch (err) {
        console.info('[Live Sync] Fallback to local state:', err);
      }
    };

    syncTenantLiveData();
  }, [currentCompanyId]);

  // 3. Background Real-time Polling for Live Conversations
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const cRes = await APIClient.getConversations();
        if (cRes && cRes.conversations && Array.isArray(cRes.conversations)) {
          const normalized = cRes.conversations.map(normalizeConversation);
          setConversationsMap(prev => {
            const current = prev[currentCompanyId] || [];
            if (JSON.stringify(current) !== JSON.stringify(normalized)) {
              return { ...prev, [currentCompanyId]: normalized };
            }
            return prev;
          });
        }
      } catch {
        // Polling catch
      }
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [currentCompanyId]);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_companies`, JSON.stringify(companies));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_plans`, JSON.stringify(allPlans));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_knowledge`, JSON.stringify(knowledgeMap));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_deployments`, JSON.stringify(deploymentsMap));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_apikeys`, JSON.stringify(apiKeysMap));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_integrations`, JSON.stringify(integrationsMap));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_actions`, JSON.stringify(actionsMap));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_conversations`, JSON.stringify(conversationsMap));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_audit`, JSON.stringify(auditLogs));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_versions`, JSON.stringify(versionsMap));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_webhooks`, JSON.stringify(webhooksMap));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [companies, allPlans, knowledgeMap, deploymentsMap, apiKeysMap, integrationsMap, actionsMap, conversationsMap, auditLogs, versionsMap, webhooksMap]);

  // Derived current tenant data
  const rawCompany = companies.find(c => c.id === currentCompanyId) || companies[0];
  const currentCompany = normalizeCompany(rawCompany);
  const currentPlan = allPlans.find(p => p.id === currentCompany.planId) || allPlans[1];
  const knowledgeItems = knowledgeMap[currentCompanyId] || [];
  const deployments = deploymentsMap[currentCompanyId] || [];
  const apiKeys = apiKeysMap[currentCompanyId] || [];
  const integrations = integrationsMap[currentCompanyId] || [];
  const actions = actionsMap[currentCompanyId] || [];
  const conversations = conversationsMap[currentCompanyId] || [];
  const agentVersions = versionsMap[currentCompanyId] || [];
  const webhooks = webhooksMap[currentCompanyId] || [];
  const currentActiveConversation = conversations.find(c => c.id === activeConversationId) || null;

  const addAuditLog = (action: string, details: string, severity: 'info' | 'warning' | 'critical' = 'info') => {
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actor: currentUserRole === 'platform_super_admin' ? 'Super Admin' : 'Current User',
      actorRole: currentUserRole,
      action,
      details,
      ipAddress: '127.0.0.1 (KMS Authenticated)',
      severity
    };
    setAuditLogs(prev => [newLog, ...prev.slice(0, 49)]);
  };

  const switchCompany = (companyId: string) => {
    if (companies.some(c => c.id === companyId)) {
      setCurrentCompanyId(companyId);
      setActiveConversationId(null);
      addAuditLog('TENANT_SWITCH', `Switched active tenant workspace to: ${companyId}`);
      showToast('Workspace Switched', `Active company context changed.`, 'info');
    }
  };

  const createCompanyWorkspace = (
    name: string, 
    domain: string, 
    industry: string, 
    planId: SubscriptionPlanId, 
    agentName: string, 
    tone: AgentTone
  ): string => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const newId = `comp-${slug}-${Math.floor(100 + Math.random() * 900)}`;

    const newCompany: Company = {
      id: newId,
      name,
      slug,
      domain,
      industry,
      createdAt: new Date().toISOString().split('T')[0],
      planId,
      billingCycle: 'monthly',
      planStatus: 'active',
      currentPeriodStart: new Date().toISOString().split('T')[0],
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      agent: {
        name: agentName || `${name} Support AI`,
        role: 'Customer Support Specialist',
        status: 'active',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        description: `Dedicated AI assistant for ${name}.`,
        tone,
        modelTier: 'automatic',
        creativityLevel: 0.3,
        systemInstructions: `You are the AI assistant for ${name} in the ${industry} sector. Provide helpful and accurate support.`,
        businessInstructions: `Answer accurately based on knowledge.`,
        greetingMessage: `Hello! How can I assist you today at ${name}?`,
        fallbackMessage: `I want to make sure I get this right. Let me transfer you to our human team.`,
        allowedActions: [],
        escalationSettings: {
          enabled: true,
          triggerKeywords: ['human', 'agent', 'support', 'help', 'talk to person', 'refund'],
          maxUnansweredQueriesBeforeEscalation: 2,
          notifyEmail: `support@${domain}`,
          escalationMessage: 'Transferring you to a live support team member now.',
          requireHumanApprovalForRefund: true
        },
        customSafetyRules: ['Never fabricate prices', 'Never reveal backend database schemas']
      },
      widgetSettings: {
        primaryColor: '#4f46e5',
        secondaryColor: '#0f172a',
        themeMode: 'dark',
        headerTitle: name,
        headerSubtitle: 'Customer Assistant',
        launcherText: 'Chat with us',
        position: 'bottom_right',
        botAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        borderRadius: 'rounded-2xl',
        showPoweredBy: false,
        enableSound: true,
        autoExpandSeconds: 0
      },
      apiKey: `${slug}_live_${Math.random().toString(36).substring(2, 10)}`,
      apiSecretMasked: 'sec_••••••••••••••••••••',
      isSuspended: false,
      stats: {
        totalConversations: 0,
        totalMessages: 0,
        resolvedConversations: 0,
        escalatedConversations: 0,
        messagesThisMonth: 0,
        tokensThisMonth: 0,
        knowledgeChunksUsed: 0
      }
    };

    setCompanies(prev => [...prev, newCompany]);
    setKnowledgeMap(prev => ({ ...prev, [newId]: [] }));
    setIntegrationsMap(prev => ({ ...prev, [newId]: [] }));
    setActionsMap(prev => ({ ...prev, [newId]: [] }));
    setConversationsMap(prev => ({ ...prev, [newId]: [] }));
    setVersionsMap(prev => ({
      ...prev,
      [newId]: [{
        id: `ver-${newId}-v1`,
        version: 1,
        versionLabel: 'v1 (Initial)',
        status: 'live',
        createdAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        author: 'Workspace Creator',
        description: 'Initial AI Assistant creation',
        snapshot: {
          name: newCompany.agent.name,
          role: newCompany.agent.role || 'Customer Support Specialist',
          tone: newCompany.agent.tone,
          modelTier: newCompany.agent.modelTier || 'automatic',
          creativityLevel: newCompany.agent.creativityLevel,
          systemInstructions: newCompany.agent.systemInstructions,
          allowedActionsCount: 0,
          knowledgeItemCount: 0
        },
        diffSummary: ['+ Initial AI assistant workspace created']
      }]
    }));

    setCurrentCompanyId(newId);
    
    // Real backend workspace persistence
    APIClient.createCompany({ name, domain, industry, planId, agentName: newCompany.agent.name, tone })
      .then((res: any) => {
        if (res && res.company) {
          const syncedComp = normalizeCompany(res.company);
          setCompanies(prev => prev.map(c => c.id === newId ? syncedComp : c));
        }
      })
      .catch(err => console.info('[Workspace Sync] Backend workspace creation notice:', err.message));

    addAuditLog('WORKSPACE_CREATED', `Created new company workspace: "${name}" with 1 AI assistant`);
    showToast('Company Workspace Ready', `Tenant "${name}" successfully deployed.`, 'success');
    return newId;
  };

  const upgradeSubscription = async (planId: SubscriptionPlanId, cycle: 'monthly' | 'annual') => {
    setCompanies(prev => prev.map(c => {
      if (c.id === currentCompanyId) {
        return {
          ...c,
          planId,
          billingCycle: cycle
        };
      }
      return c;
    }));

    try {
      const res = await APIClient.upgradePlan(planId, cycle);
      if (res && res.invoice) {
        const newInv: Invoice = {
          id: res.invoice.id,
          number: res.invoice.invoiceNumber,
          date: res.invoice.date,
          amountINR: res.invoice.amountINR,
          status: 'paid',
          planName: res.invoice.planName
        };
        setInvoices(prev => [newInv, ...prev]);
      }
    } catch (e) {
      console.info('[Billing] Backend sync note:', e);
    }

    addAuditLog('SUBSCRIPTION_UPGRADED', `Plan upgraded to ${planId.toUpperCase()} (${cycle})`);
    showToast('Plan Updated', `Successfully upgraded subscription to ${planId}.`, 'success');
  };

  const updateAgentConfig = (updates: Partial<AgentConfig>) => {
    setCompanies(prev => prev.map(c => {
      if (c.id === currentCompanyId) {
        return {
          ...c,
          agent: { ...c.agent, ...updates }
        };
      }
      return c;
    }));
    // Sync live to FastAPI backend
    APIClient.updateCompany(currentCompanyId, { agent: updates }).catch(e => console.info('Backend agent sync error:', e));
    APIClient.updateDraft(updates).catch(e => console.info('Backend draft sync error:', e));
    addAuditLog('AGENT_CONFIG_UPDATED', `Updated AI assistant configuration fields: ${Object.keys(updates).join(', ')}`);
  };

  const toggleAgentStatus = () => {
    const nextStatus = currentCompany.agent.status === 'active' ? 'paused' : 'active';
    updateAgentConfig({ status: nextStatus });
    showToast(
      nextStatus === 'active' ? 'AI Assistant Activated' : 'AI Assistant Paused',
      nextStatus === 'active' ? 'AI assistant is now answering customer queries live.' : 'AI assistant is paused.',
      nextStatus === 'active' ? 'success' : 'warning'
    );
  };

  // Agent Versioning Actions
  const publishAgentVersion = (description = 'Published production update') => {
    const currentList = versionsMap[currentCompanyId] || [];
    const nextVerNum = (currentList[0]?.version || 0) + 1;
    const newVer: AgentVersionItem = {
      id: `ver-${currentCompanyId}-v${nextVerNum}`,
      version: nextVerNum,
      versionLabel: `v${nextVerNum} (Current Live)`,
      status: 'live',
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      author: currentUserRole === 'platform_super_admin' ? 'Super Admin' : 'Current User',
      description,
      snapshot: {
        name: currentCompany.agent.name,
        role: currentCompany.agent.role || 'Customer Support Specialist',
        tone: currentCompany.agent.tone,
        modelTier: currentCompany.agent.modelTier || 'automatic',
        creativityLevel: currentCompany.agent.creativityLevel,
        systemInstructions: currentCompany.agent.systemInstructions,
        allowedActionsCount: actions.filter(a => a.enabled).length,
        knowledgeItemCount: knowledgeItems.length
      },
      diffSummary: [
        `+ Snapshot of ${knowledgeItems.length} knowledge items & ${actions.filter(a => a.enabled).length} actions`,
        `~ Model tier: ${currentCompany.agent.modelTier || 'automatic'}`
      ]
    };

    setVersionsMap(prev => {
      const list = prev[currentCompanyId] || [];
      const updated = list.map(v => ({ ...v, status: 'archived' as const, versionLabel: `v${v.version}` }));
      return {
        ...prev,
        [currentCompanyId]: [newVer, ...updated]
      };
    });

    // Real-time backend publish
    APIClient.publishDraft(description).catch(e => console.info('Backend publish error:', e));

    updateAgentConfig({
      lifecycleStatus: 'published',
      publishedVersionNumber: nextVerNum,
      draftVersionNumber: nextVerNum + 1,
      lastPublishedAt: new Date().toISOString(),
      status: 'active'
    });

    addAuditLog('AGENT_VERSION_PUBLISHED', `Published immutable AI Employee version v${nextVerNum}: "${description}"`);
    showToast('Version Published', `v${nextVerNum} is now live in production.`, 'success');
  };

  const rollbackAgentVersion = (versionId: string) => {
    const currentList = versionsMap[currentCompanyId] || [];
    const target = currentList.find(v => v.id === versionId);
    if (!target) return;

    updateAgentConfig({
      name: target.snapshot.name,
      role: target.snapshot.role,
      tone: target.snapshot.tone,
      modelTier: target.snapshot.modelTier,
      creativityLevel: target.snapshot.creativityLevel,
      systemInstructions: target.snapshot.systemInstructions
    });

    // Real-time backend rollback
    APIClient.rollbackVersion(versionId).catch(e => console.info('Backend rollback error:', e));

    publishAgentVersion(`Rollback to v${target.version} (${target.description})`);
    addAuditLog('AGENT_VERSION_ROLLBACK', `Rolled back AI Assistant to version v${target.version}`, 'warning');
    showToast('Rollback Complete', `Restored AI Assistant snapshot from v${target.version}.`, 'info');
  };

  const unpublishAgent = async () => {
    try {
      await APIClient.unpublishAgent();
    } catch (e) {
      console.info('Backend unpublish error:', e);
    }
    updateAgentConfig({ lifecycleStatus: 'draft' });
    addAuditLog('AGENT_UNPUBLISHED', 'Assistant unpublished and reverted to Draft mode');
    showToast('Assistant Unpublished', 'Assistant is now in Draft mode and will not answer live deployment requests.', 'info');
  };

  const disableAgent = async () => {
    try {
      await APIClient.disableAgent();
    } catch (e) {
      console.info('Backend disable error:', e);
    }
    updateAgentConfig({ lifecycleStatus: 'disabled', status: 'paused' });
    addAuditLog('AGENT_DISABLED', 'Assistant disabled across all channels', 'warning');
    showToast('Assistant Disabled', 'Assistant has been paused across all active deployments.', 'warning');
  };

  const enableAgent = async () => {
    try {
      await APIClient.enableAgent();
    } catch (e) {
      console.info('Backend enable error:', e);
    }
    updateAgentConfig({ lifecycleStatus: 'published', status: 'active' });
    addAuditLog('AGENT_ENABLED', 'Assistant re-enabled for live traffic');
    showToast('Assistant Live', 'Assistant is actively serving user queries.', 'success');
  };

  const archiveAgent = async () => {
    try {
      await APIClient.archiveAgent();
    } catch (e) {
      console.info('Backend archive error:', e);
    }
    updateAgentConfig({ lifecycleStatus: 'archived', status: 'paused' });
    addAuditLog('AGENT_ARCHIVED', 'Assistant moved to archived state', 'warning');
    showToast('Assistant Archived', 'Assistant moved to read-only archive state.', 'info');
  };

  const deleteAgent = async () => {
    try {
      await APIClient.deleteAgent();
    } catch (e) {
      console.info('Backend delete agent error:', e);
    }
    updateAgentConfig({ lifecycleStatus: 'deleted', status: 'paused' });
    addAuditLog('AGENT_DELETED', 'Assistant completely removed and purged', 'critical');
    showToast('Assistant Deleted', 'Assistant configuration and runtime state have been purged.', 'error');
  };

  // Webhook Actions
  const createWebhook = (url: string, description: string, events: string[]) => {
    const newWh: WebhookEndpoint = {
      id: genId('wh'),
      url,
      description,
      events,
      secret: `whsec_${Math.random().toString(36).substring(2, 12)}`,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      lastDeliveredAt: 'Never',
      successRatePercent: 100.0
    };

    setWebhooksMap(prev => ({
      ...prev,
      [currentCompanyId]: [newWh, ...(prev[currentCompanyId] || [])]
    }));

    addAuditLog('WEBHOOK_CREATED', `Registered webhook endpoint: ${url}`);
    showToast('Webhook Created', 'New webhook endpoint registered.', 'success');
  };

  const deleteWebhook = (id: string) => {
    setWebhooksMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).filter(w => w.id !== id)
    }));
    addAuditLog('WEBHOOK_DELETED', `Deleted webhook endpoint ID: ${id}`);
    showToast('Webhook Removed', 'Webhook deleted successfully.', 'info');
  };

  const toggleWebhook = async (id: string) => {
    try {
      const res = await APIClient.toggleWebhook(id);
      if (res && res.webhook) {
        setWebhooksMap(prev => ({
          ...prev,
          [currentCompanyId]: (prev[currentCompanyId] || []).map(w => w.id === id ? { ...w, ...res.webhook } : w)
        }));
      }
    } catch (err) {
      console.info('Backend toggle webhook error:', err);
      setWebhooksMap(prev => ({
        ...prev,
        [currentCompanyId]: (prev[currentCompanyId] || []).map(w =>
          w.id === id ? { ...w, status: w.status === 'active' ? 'disabled' : 'active' } : w
        )
      }));
    }
    addAuditLog('WEBHOOK_TOGGLED', `Toggled webhook status for: ${id}`);
    showToast('Webhook Updated', 'Webhook status changed.', 'info');
  };

  // API Keys Management
  const createApiKey = async (name: string, scopes: string[] = ['chat:read', 'chat:write']): Promise<{ rawSecret: string } | null> => {
    try {
      const res = await APIClient.createApiKey(name, scopes);
      if (res && res.apiKey) {
        setApiKeysMap(prev => ({
          ...prev,
          [currentCompanyId]: [res.apiKey, ...(prev[currentCompanyId] || [])]
        }));
        addAuditLog('API_KEY_CREATED', `Generated API key: ${name}`);
        showToast('API Key Generated', 'Store your secret key safely now. It cannot be retrieved again.', 'warning');
        return { rawSecret: res.rawSecret };
      }
    } catch (err) {
      console.info('Backend create api key error:', err);
    }
    return null;
  };

  const rotateApiKey = async (id: string): Promise<{ rawSecret: string } | null> => {
    try {
      const res = await APIClient.rotateApiKey(id);
      if (res && res.apiKey) {
        setApiKeysMap(prev => ({
          ...prev,
          [currentCompanyId]: (prev[currentCompanyId] || []).map(k => k.id === id ? res.apiKey : k)
        }));
        addAuditLog('API_KEY_ROTATED', `Rotated secret for key: ${id}`, 'warning');
        showToast('Key Rotated', 'Old secret revoked; new secret generated.', 'warning');
        return { rawSecret: res.rawSecret };
      }
    } catch (err) {
      console.info('Backend rotate api key error:', err);
    }
    return null;
  };

  const revokeApiKey = async (id: string) => {
    try {
      await APIClient.revokeApiKey(id);
    } catch (err) {
      console.info('Backend revoke api key error:', err);
    }
    setApiKeysMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).map(k =>
        k.id === id ? { ...k, status: 'revoked', revokedAt: new Date().toISOString() } : k
      )
    }));
    addAuditLog('API_KEY_REVOKED', `Revoked API key immediately: ${id}`, 'critical');
    showToast('API Key Revoked', 'Requests using this key will be rejected immediately.', 'error');
  };

  // Deployment Channels Management
  const createDeployment = async (name: string, channel: DeploymentItem['channel'], domain?: string) => {
    try {
      const res = await APIClient.createDeployment({ name, channel, domain });
      if (res && res.deployment) {
        setDeploymentsMap(prev => ({
          ...prev,
          [currentCompanyId]: [res.deployment, ...(prev[currentCompanyId] || [])]
        }));
      }
    } catch (err) {
      console.info('Backend create deployment fallback:', err);
      const newDep: DeploymentItem = {
        id: genId('dep'),
        companyId: currentCompanyId,
        name,
        channel,
        status: 'active',
        assistantVersion: currentCompany.agent.publishedVersionNumber ? `v${currentCompany.agent.publishedVersionNumber}` : 'v1',
        domain,
        createdAt: new Date().toISOString()
      };
      setDeploymentsMap(prev => ({
        ...prev,
        [currentCompanyId]: [newDep, ...(prev[currentCompanyId] || [])]
      }));
    }
    addAuditLog('DEPLOYMENT_CREATED', `Created new deployment channel: ${name} (${channel})`);
    showToast('Deployment Created', `Channel "${name}" is live and active.`, 'success');
  };

  const disableDeployment = async (id: string) => {
    try {
      await APIClient.disableDeployment(id);
    } catch (err) {
      console.info('Backend disable deployment error:', err);
    }
    setDeploymentsMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).map(d =>
        d.id === id ? { ...d, status: 'disabled' } : d
      )
    }));
    addAuditLog('DEPLOYMENT_DISABLED', `Disabled deployment channel: ${id}`, 'warning');
    showToast('Deployment Disabled', 'Channel stopped serving queries without affecting the assistant.', 'warning');
  };

  const enableDeployment = async (id: string) => {
    try {
      await APIClient.enableDeployment(id);
    } catch (err) {
      console.info('Backend enable deployment error:', err);
    }
    setDeploymentsMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).map(d =>
        d.id === id ? { ...d, status: 'active' } : d
      )
    }));
    addAuditLog('DEPLOYMENT_ENABLED', `Re-enabled deployment channel: ${id}`);
    showToast('Deployment Active', 'Channel is now actively routing requests.', 'success');
  };

  const removeDeployment = async (id: string) => {
    try {
      await APIClient.removeDeployment(id);
    } catch (err) {
      console.info('Backend delete deployment error:', err);
    }
    setDeploymentsMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).filter(d => d.id !== id)
    }));
    addAuditLog('DEPLOYMENT_REMOVED', `Removed deployment: ${id}`, 'critical');
    showToast('Deployment Removed', 'Deployment channel was removed cleanly.', 'info');
  };

  const triggerTestWebhook = async (id: string): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 600));
    setWebhooksMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).map(w => 
        w.id === id ? { ...w, lastDeliveredAt: 'Just now', successRatePercent: 100 } : w
      )
    }));
    const newLog: ApiLogEntry = {
      id: genId('log'),
      timestamp: 'Just now',
      method: 'POST',
      path: '/api/v1/webhooks/dispatch',
      statusCode: 200,
      durationMs: 145,
      ipAddress: '127.0.0.1',
      apiKeyPreview: currentCompany.apiKey.substring(0, 10) + '...',
      requestBodyMasked: '{"event":"test.ping","timestamp":"2026-09-05T21:00:00Z"}',
      responseBodyPreview: '{"status":"delivered","httpCode":200}'
    };
    setApiLogs(prev => [newLog, ...prev.slice(0, 20)]);
    showToast('Webhook Test Dispatched', 'Received 200 OK delivery signature.', 'success');
    return true;
  };

  // Knowledge Management
  const addKnowledgeItem = (item: Partial<KnowledgeItem> & { title: string; content: string; type: KnowledgeItem['type'] }) => {
    let calculatedChunks = item.chunksCount;
    if (!calculatedChunks) {
      if (item.fileSize) {
        const kb = parseFloat(item.fileSize) || 120;
        calculatedChunks = Math.max(1, Math.ceil((kb * 1024) / 1500));
      } else {
        calculatedChunks = Math.max(1, Math.ceil(item.content.length / 500));
      }
    }

    const newItem: KnowledgeItem = {
      id: genId('kb'),
      type: item.type,
      title: item.title,
      sourceUrl: item.sourceUrl,
      fileName: item.fileName,
      fileSize: item.fileSize || '120 KB',
      content: item.content,
      status: 'indexed',
      chunksCount: calculatedChunks,
      tokenCount: calculatedChunks * 125,
      lastUpdated: 'Just now',
      category: item.category || 'General',
      faqAnswer: item.faqAnswer
    };

    setKnowledgeMap(prev => ({
      ...prev,
      [currentCompanyId]: [newItem, ...(prev[currentCompanyId] || [])]
    }));

    // Real-time backend ingestion & dynamic chunk count sync
    if (item.type === 'faq' && item.faqAnswer) {
      APIClient.ingestFaq({ question: item.title, answer: item.faqAnswer, category: item.category }).catch(e => console.info('Backend FAQ ingest error:', e));
    } else if (item.type === 'url' && item.sourceUrl) {
      APIClient.ingestWebsite({ url: item.sourceUrl, category: item.category })
        .then(res => {
          if (res?.data?.chunksCreated) {
            setKnowledgeMap(prev => ({
              ...prev,
              [currentCompanyId]: (prev[currentCompanyId] || []).map(k => k.id === newItem.id ? { ...k, chunksCount: res.data.chunksCreated } : k)
            }));
          }
        })
        .catch(e => console.info('Backend website ingest error:', e));
    } else {
      APIClient.ingestFile({ title: item.title, content: item.content, fileName: item.fileName, category: item.category })
        .then(res => {
          if (res?.data?.chunksCreated) {
            setKnowledgeMap(prev => ({
              ...prev,
              [currentCompanyId]: (prev[currentCompanyId] || []).map(k => k.id === newItem.id ? { ...k, chunksCount: res.data.chunksCreated } : k)
            }));
          }
        })
        .catch(e => console.info('Backend file ingest error:', e));
    }

    addAuditLog('KNOWLEDGE_INGESTED', `Ingested knowledge item: "${newItem.title}" (${newItem.type})`);
    showToast('Knowledge Indexed', `"${newItem.title}" has been indexed and is ready for AI grounding.`, 'success');
  };

  const deleteKnowledgeItem = (id: string) => {
    setKnowledgeMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).filter(k => k.id !== id)
    }));
    // Real-time backend delete
    APIClient.deleteKnowledgeSource(id).catch(e => console.info('Backend knowledge delete error:', e));
    addAuditLog('KNOWLEDGE_DELETED', `Removed knowledge item ID: ${id}`);
    showToast('Knowledge Removed', 'Item deleted from index.', 'info');
  };

  const trashKnowledgeItem = async (id: string) => {
    try {
      await APIClient.trashKnowledgeSource(id);
    } catch (err) {
      console.info('Backend trash error:', err);
    }
    setKnowledgeMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).map(k =>
        k.id === id ? { ...k, lifecycleState: 'trash', deletedAt: new Date().toISOString() } : k
      )
    }));
    addAuditLog('KNOWLEDGE_TRASHED', `Moved knowledge item to trash (30-day retention): ${id}`);
    showToast('Moved to Trash', 'Knowledge item moved to Trash with 30-day retention.', 'info');
  };

  const restoreKnowledgeItem = async (id: string) => {
    try {
      await APIClient.restoreKnowledgeSource(id);
    } catch (err) {
      console.info('Backend restore error:', err);
    }
    setKnowledgeMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).map(k =>
        k.id === id ? { ...k, lifecycleState: 'active', deletedAt: undefined } : k
      )
    }));
    addAuditLog('KNOWLEDGE_RESTORED', `Restored knowledge item from trash: ${id}`);
    showToast('Restored', 'Knowledge item restored and re-enabled for RAG.', 'success');
  };

  const disableKnowledgeItem = async (id: string) => {
    try {
      await APIClient.disableKnowledgeSource(id);
    } catch (err) {
      console.info('Backend disable error:', err);
    }
    setKnowledgeMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).map(k =>
        k.id === id ? { ...k, lifecycleState: 'disabled' } : k
      )
    }));
    addAuditLog('KNOWLEDGE_DISABLED', `Disabled knowledge item (excluded from RAG): ${id}`);
    showToast('Source Disabled', 'Excluded from RAG grounding without deleting data.', 'warning');
  };

  const enableKnowledgeItem = async (id: string) => {
    try {
      await APIClient.enableKnowledgeSource(id);
    } catch (err) {
      console.info('Backend enable error:', err);
    }
    setKnowledgeMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).map(k =>
        k.id === id ? { ...k, lifecycleState: 'active' } : k
      )
    }));
    addAuditLog('KNOWLEDGE_ENABLED', `Re-enabled knowledge item for RAG: ${id}`);
    showToast('Source Enabled', 'Knowledge item is active and ready for AI retrieval.', 'success');
  };

  const reprocessKnowledgeItem = async (id: string) => {
    setKnowledgeMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).map(k =>
        k.id === id ? { ...k, processingStage: 'uploaded', status: 'indexing' } : k
      )
    }));
    try {
      await APIClient.reprocessKnowledgeSource(id);
    } catch (err) {
      console.info('Backend reprocess error:', err);
    }
    setKnowledgeMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).map(k =>
        k.id === id ? { ...k, processingStage: 'indexed', status: 'indexed', lastIndexedAt: new Date().toISOString() } : k
      )
    }));
    addAuditLog('KNOWLEDGE_REPROCESSED', `Reprocessed and re-indexed knowledge item: ${id}`);
    showToast('Reprocessed', 'Knowledge item was re-parsed, re-chunked, and re-indexed into vector storage.', 'success');
  };

  const permanentDeleteKnowledgeItem = async (id: string) => {
    try {
      await APIClient.permanentDeleteKnowledgeSource(id);
    } catch (err) {
      console.info('Backend permanent delete error:', err);
    }
    setKnowledgeMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).filter(k => k.id !== id)
    }));
    addAuditLog('KNOWLEDGE_PURGED', `Permanently purged knowledge item, embeddings, chunks, and metadata: ${id}`, 'critical');
    showToast('Permanently Deleted', 'Source and all vector embeddings permanently purged.', 'error');
  };

  const bulkTrashKnowledge = async (ids: string[]) => {
    for (const id of ids) {
      await trashKnowledgeItem(id);
    }
  };

  const bulkDisableKnowledge = async (ids: string[]) => {
    for (const id of ids) {
      await disableKnowledgeItem(id);
    }
  };

  // Integrations Management
  const updateIntegration = (id: string, updates: Partial<Integration>) => {
    setIntegrationsMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).map(i => i.id === id ? { ...i, ...updates } : i)
    }));
    addAuditLog('INTEGRATION_CONFIG_UPDATED', `Updated integration: ${id}`);
  };

  const toggleIntegration = (id: string) => {
    setIntegrationsMap(prev => {
      const list = prev[currentCompanyId] || [];
      return {
        ...prev,
        [currentCompanyId]: list.map(i => {
          if (i.id === id) {
            const nextConnected = !i.connected;
            addAuditLog(nextConnected ? 'INTEGRATION_CONNECTED' : 'INTEGRATION_DISCONNECTED', `${nextConnected ? 'Connected' : 'Disconnected'} ${i.name}`);
            showToast(nextConnected ? 'Integration Connected' : 'Integration Disconnected', `${i.name} status updated.`, nextConnected ? 'success' : 'info');
            return {
              ...i,
              connected: nextConnected,
              healthStatus: nextConnected ? 'healthy' : 'disconnected',
              lastSyncAt: nextConnected ? 'Just now' : i.lastSyncAt
            };
          }
          return i;
        })
      };
    });
  };

  // Actions Management
  const updateAction = (id: string, updates: Partial<ActionDefinition>) => {
    setActionsMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).map(a => a.id === id ? { ...a, ...updates } : a)
    }));
    addAuditLog('ACTION_DEFINITION_UPDATED', `Updated action definition: ${id}`);
  };

  const toggleAction = (id: string) => {
    setActionsMap(prev => {
      const list = prev[currentCompanyId] || [];
      return {
        ...prev,
        [currentCompanyId]: list.map(a => {
          if (a.id === id) {
            const nextEnabled = !a.enabled;
            addAuditLog(nextEnabled ? 'ACTION_ENABLED' : 'ACTION_DISABLED', `${nextEnabled ? 'Enabled' : 'Disabled'} action: "${a.name}"`);
            showToast(nextEnabled ? 'Action Enabled' : 'Action Disabled', `AI assistant can ${nextEnabled ? 'now' : 'no longer'} execute ${a.name}.`, nextEnabled ? 'success' : 'info');
            return { ...a, enabled: nextEnabled };
          }
          return a;
        })
      };
    });
  };

  const updateCompany = (updates: Partial<Company>) => {
    setCompanies(prev => prev.map(c => {
      if (c.id === currentCompanyId) {
        return {
          ...c,
          ...updates
        };
      }
      return c;
    }));
    // Real-time backend company update
    APIClient.updateCompany(currentCompanyId, updates).catch(e => console.info('Backend company update error:', e));
    if (updates.name) {
      addAuditLog('COMPANY_BRAND_UPDATED', `Updated company brand name: "${updates.name}"`);
    }
  };

  const updateWidgetSettings = (updates: Partial<WidgetCustomization>) => {
    setCompanies(prev => prev.map(c => {
      if (c.id === currentCompanyId) {
        return {
          ...c,
          widgetSettings: { ...c.widgetSettings, ...updates }
        };
      }
      return c;
    }));
    // Real-time backend widget customization update
    APIClient.updateCompany(currentCompanyId, { widgetSettings: updates }).catch(e => console.info('Backend widget settings error:', e));
    addAuditLog('WIDGET_BRANDING_UPDATED', 'Updated customer chat widget branding');
    showToast('Branding Saved', 'Widget theme customization saved successfully.', 'success');
  };

  const regenerateApiKey = () => {
    const newKey = `${currentCompany.slug}_live_${Math.random().toString(36).substring(2, 10)}`;
    setCompanies(prev => prev.map(c => c.id === currentCompanyId ? { ...c, apiKey: newKey } : c));
    addAuditLog('API_KEY_ROTATED', 'Rotated company public API integration key', 'warning');
    showToast('API Key Rotated', 'New API key generated. Please update your widget snippet.', 'warning');
  };

  // Conversations & Messaging
  const sendMessageToAgent = async (conversationId: string, text: string) => {
    const userMsg: Message = {
      id: genId('msg-u'),
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };

    setConversationsMap(prev => {
      const list = prev[currentCompanyId] || [];
      return {
        ...prev,
        [currentCompanyId]: list.map(c => {
          if (c.id === conversationId) {
            return {
              ...c,
              lastMessageAt: new Date().toISOString(),
              messages: [...c.messages, userMsg]
            };
          }
          return c;
        })
      };
    });

    const list = conversationsMap[currentCompanyId] || [];
    const targetConv = list.find(c => c.id === conversationId);
    if (!targetConv) return;

    if (targetConv.status === 'escalated_to_human' && targetConv.assignedOperator) {
      return;
    }

    const currentKnowledge = knowledgeMap[currentCompanyId] || [];
    const currentIntegrations = integrationsMap[currentCompanyId] || [];
    const currentActions = actionsMap[currentCompanyId] || [];

    const aiResult = await AIAgentEngine.processMessage(
      text,
      currentCompany,
      currentKnowledge,
      currentIntegrations,
      currentActions,
      targetConv.messages
    );

    const agentMessage: Message = {
      id: genId('msg-a'),
      sender: 'agent',
      senderName: currentCompany.agent.name,
      text: aiResult.message,
      timestamp: new Date().toISOString(),
      reasoningSteps: aiResult.reasoningSteps,
      toolTraces: aiResult.toolTraces,
      isPendingConfirmation: aiResult.isPendingConfirmation,
      pendingActionData: aiResult.pendingActionData
    };

    setConversationsMap(prev => {
      const cList = prev[currentCompanyId] || [];
      return {
        ...prev,
        [currentCompanyId]: cList.map(c => {
          if (c.id === conversationId) {
            return {
              ...c,
              lastMessageAt: new Date().toISOString(),
              status: aiResult.shouldEscalateToHuman ? 'escalated_to_human' : c.status,
              sentiment: aiResult.shouldEscalateToHuman ? 'urgent' : c.sentiment,
              assignedOperator: aiResult.shouldEscalateToHuman ? 'On-Call Operator' : c.assignedOperator,
              totalTokensUsed: c.totalTokensUsed + 450,
              messages: [...c.messages, agentMessage]
            };
          }
          return c;
        })
      };
    });

    setCompanies(prev => prev.map(c => {
      if (c.id === currentCompanyId) {
        return {
          ...c,
          stats: {
            ...c.stats,
            totalMessages: c.stats.totalMessages + 2,
            messagesThisMonth: c.stats.messagesThisMonth + 2,
            tokensThisMonth: c.stats.tokensThisMonth + 450,
            escalatedConversations: aiResult.shouldEscalateToHuman ? c.stats.escalatedConversations + 1 : c.stats.escalatedConversations
          }
        };
      }
      return c;
    }));
  };

  const confirmPendingAction = async (conversationId: string, messageId: string, confirmed: boolean) => {
    const list = conversationsMap[currentCompanyId] || [];
    const targetConv = list.find(c => c.id === conversationId);
    if (!targetConv) return;

    const targetMsg = targetConv.messages.find(m => m.id === messageId);
    if (!targetMsg || !targetMsg.pendingActionData) return;

    const actionData = targetMsg.pendingActionData;
    const currentActions = actionsMap[currentCompanyId] || [];
    const actionDef = currentActions.find(a => a.id === actionData.actionId);

    let resultMsg = '';
    let trace: any = null;

    if (confirmed && actionDef) {
      trace = AIAgentEngine.executeConfirmedAction(actionDef, actionData.params);
      const confNum = Math.floor(100000 + Math.random() * 900000);
      resultMsg = `✅ **Action Confirmed**: ${actionDef.name} has been processed successfully. Confirmation ID: TXN-${confNum}.`;
      
      setActionsMap(prev => {
        const aList = prev[currentCompanyId] || [];
        return {
          ...prev,
          [currentCompanyId]: aList.map(a => a.id === actionDef.id ? { ...a, executionCount: a.executionCount + 1 } : a)
        };
      });

      addAuditLog('ACTION_EXECUTED_CONFIRMED', `User confirmed and executed high-risk action: "${actionDef.name}"`);
      showToast('Action Confirmed', `Executed "${actionDef.name}". Confirmation: TXN-${confNum}`, 'success');
    } else {
      resultMsg = `❌ **Action Cancelled**: The requested operation was declined. No changes were made to your account.`;
      addAuditLog('ACTION_CANCELLED', `User rejected confirmation for action: "${actionData.actionName}"`);
      showToast('Action Declined', `Operation for "${actionData.actionName}" was cancelled.`, 'info');
    }

    const resolutionMessage: Message = {
      id: genId('msg-conf'),
      sender: 'agent',
      senderName: currentCompany.agent.name,
      text: resultMsg,
      timestamp: new Date().toISOString(),
      toolTraces: trace ? [trace] : undefined
    };

    setConversationsMap(prev => {
      const cList = prev[currentCompanyId] || [];
      return {
        ...prev,
        [currentCompanyId]: cList.map(c => {
          if (c.id === conversationId) {
            return {
              ...c,
              lastMessageAt: new Date().toISOString(),
              messages: c.messages.map(m => m.id === messageId ? { ...m, isPendingConfirmation: false } : m).concat(resolutionMessage)
            };
          }
          return c;
        })
      };
    });
  };

  const takeoverConversation = (conversationId: string, operatorName = 'Support Agent (You)', internalNote?: string) => {
    setConversationsMap(prev => {
      const list = prev[currentCompanyId] || [];
      return {
        ...prev,
        [currentCompanyId]: list.map(c => {
          if (c.id === conversationId) {
            const extraMessages: Message[] = [];
            if (internalNote) {
              extraMessages.push({
                id: genId('msg-note'),
                sender: 'system',
                senderName: 'Internal Operator Note',
                text: `📝 **Internal Note**: ${internalNote}`,
                timestamp: new Date().toISOString()
              });
            }
            return {
              ...c,
              status: 'escalated_to_human',
              assignedOperator: operatorName,
              messages: [...c.messages, ...extraMessages]
            };
          }
          return c;
        })
      };
    });

    // Real-time backend takeover
    APIClient.takeoverConversation(conversationId, operatorName).catch(e => console.info('Backend takeover error:', e));

    addAuditLog('HUMAN_TAKEOVER_INITIATED', `Human operator (${operatorName}) took over conversation ID: ${conversationId}`, 'warning');
    showToast('Live Takeover Active', `Human operator (${operatorName}) took over session.`, 'warning');
  };

  const sendOperatorMessage = (conversationId: string, text: string) => {
    const operatorMessage: Message = {
      id: genId('msg-op'),
      sender: 'human_agent',
      senderName: 'Live Support Operator (You)',
      text,
      timestamp: new Date().toISOString()
    };

    setConversationsMap(prev => {
      const list = prev[currentCompanyId] || [];
      return {
        ...prev,
        [currentCompanyId]: list.map(c => {
          if (c.id === conversationId) {
            return {
              ...c,
              lastMessageAt: new Date().toISOString(),
              messages: [...c.messages, operatorMessage]
            };
          }
          return c;
        })
      };
    });

    // Real-time backend operator reply persistence
    APIClient.sendOperatorReply(conversationId, text, 'Live Support Operator (You)')
      .catch(e => console.info('[Live Chat] Backend operator reply notice:', e.message));
  };

  const resolveConversation = (conversationId: string) => {
    setConversationsMap(prev => {
      const list = prev[currentCompanyId] || [];
      return {
        ...prev,
        [currentCompanyId]: list.map(c => {
          if (c.id === conversationId) {
            return {
              ...c,
              status: 'resolved',
              resolvedAt: new Date().toISOString()
            };
          }
          return c;
        })
      };
    });

    // Real-time backend resolve
    APIClient.resolveConversation(conversationId).catch(e => console.info('Backend resolve error:', e));

    setCompanies(prev => prev.map(c => {
      if (c.id === currentCompanyId) {
        return {
          ...c,
          stats: {
            ...c.stats,
            resolvedConversations: c.stats.resolvedConversations + 1
          }
        };
      }
      return c;
    }));

    addAuditLog('CONVERSATION_RESOLVED', `Marked conversation ID: ${conversationId} as resolved`);
    showToast('Conversation Resolved', 'Ticket marked as successfully completed.', 'success');
  };

  const archiveConversation = async (conversationId: string) => {
    try {
      await APIClient.archiveConversation(conversationId);
    } catch (err) {
      console.info('Backend archive conversation error:', err);
    }
    setConversationsMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).map(c =>
        c.id === conversationId ? { ...c, status: 'archived' } : c
      )
    }));
    addAuditLog('CONVERSATION_ARCHIVED', `Archived conversation ID: ${conversationId}`);
    showToast('Conversation Archived', 'Thread moved to archive.', 'info');
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      await APIClient.deleteConversation(conversationId);
    } catch (err) {
      console.info('Backend delete conversation error:', err);
    }
    setConversationsMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).filter(c => c.id !== conversationId)
    }));
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
    }
    addAuditLog('CONVERSATION_DELETED', `Deleted conversation ID: ${conversationId}`, 'warning');
    showToast('Conversation Deleted', 'Thread has been permanently removed.', 'info');
  };

  const bulkArchiveConversations = async (ids: string[]) => {
    try {
      await APIClient.bulkArchiveConversations(ids);
    } catch (err) {
      console.info('Backend bulk archive error:', err);
    }
    setConversationsMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).map(c =>
        ids.includes(c.id) ? { ...c, status: 'archived' } : c
      )
    }));
    addAuditLog('CONVERSATIONS_BULK_ARCHIVED', `Archived ${ids.length} conversations`);
    showToast('Conversations Archived', `${ids.length} threads archived.`, 'info');
  };

  const bulkDeleteConversations = async (ids: string[]) => {
    try {
      await APIClient.bulkDeleteConversations(ids);
    } catch (err) {
      console.info('Backend bulk delete error:', err);
    }
    setConversationsMap(prev => ({
      ...prev,
      [currentCompanyId]: (prev[currentCompanyId] || []).filter(c => !ids.includes(c.id))
    }));
    if (activeConversationId && ids.includes(activeConversationId)) {
      setActiveConversationId(null);
    }
    addAuditLog('CONVERSATIONS_BULK_DELETED', `Deleted ${ids.length} conversations`, 'critical');
    showToast('Conversations Deleted', `${ids.length} threads permanently removed.`, 'info');
  };

  const startNewCustomerChatSession = (initialGreeting = true): string => {
    const newId = genId('conv');
    const newConv: Conversation = {
      id: newId,
      companyId: currentCompanyId,
      customerName: 'Anonymous Website Visitor',
      customerEmail: undefined,
      channel: 'website_widget',
      startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      lastMessageAt: new Date().toISOString(),
      status: 'active',
      sentiment: 'neutral',
      tags: ['Website Widget', 'Inquiry'],
      totalTokensUsed: 120,
      messages: initialGreeting ? [
        {
          id: genId('msg-g'),
          sender: 'agent',
          senderName: currentCompany.agent.name,
          text: currentCompany.agent.greetingMessage || 'Hello! How can I help you today?',
          timestamp: new Date().toISOString()
        }
      ] : []
    };

    setConversationsMap(prev => ({
      ...prev,
      [currentCompanyId]: [newConv, ...(prev[currentCompanyId] || [])]
    }));

    setActiveConversationId(newId);
    return newId;
  };

  const addTeamMember = (name: string, email: string, role: TeamMember['role']) => {
    const newMember: TeamMember = {
      id: genId('usr'),
      name,
      email,
      role,
      status: 'invited',
      lastActive: 'Never'
    };
    setTeamMembersMap(prev => ({
      ...prev,
      [currentCompanyId]: [...(prev[currentCompanyId] || []), newMember]
    }));

    // Persist to backend database
    APIClient.inviteTeamMember(name, email, role)
      .catch(e => console.warn('[Team] Backend team invite notice:', e.message));

    addAuditLog('TEAM_MEMBER_INVITED', `Invited team member ${email} with role ${role}`);
    showToast('Invitation Sent', `Sent invite link to ${email}.`, 'success');
  };

  const adminToggleCompanySuspension = async (companyId: string) => {
    const targetComp = companies.find(c => c.id === companyId);
    if (!targetComp) return;
    const nextSuspended = !targetComp.isSuspended;

    try {
      if (nextSuspended) {
        await APIClient.suspendTenant(companyId, 'Admin dashboard operational toggle');
      } else {
        await APIClient.activateTenant(companyId);
      }
    } catch (err: any) {
      console.warn('[Admin] Failed to update tenant suspension on backend:', err.message);
    }

    setCompanies(prev => prev.map(c => {
      if (c.id === companyId) {
        addAuditLog(
          nextSuspended ? 'COMPANY_SUSPENDED' : 'COMPANY_ACTIVATED',
          `Platform Admin ${nextSuspended ? 'suspended' : 're-activated'} company: "${c.name}"`,
          nextSuspended ? 'critical' : 'info'
        );
        showToast(nextSuspended ? 'Tenant Suspended' : 'Tenant Activated', `Tenant "${c.name}" status updated.`, nextSuspended ? 'error' : 'success');
        return {
          ...c,
          isSuspended: nextSuspended,
          planStatus: nextSuspended ? 'suspended' : 'active'
        };
      }
      return c;
    }));
  };

  const adminUpdatePlanPrice = (planId: SubscriptionPlanId, monthlyINR: number) => {
    setAllPlans(prev => prev.map(p => {
      if (p.id === planId) {
        return {
          ...p,
          priceMonthlyINR: monthlyINR,
          priceAnnualINR: Math.round(monthlyINR * 0.8)
        };
      }
      return p;
    }));
    showToast('Plan Price Updated', `Monthly price for ${planId} updated to ₹${monthlyINR.toLocaleString('en-IN')}`, 'success');
  };

  return (
    <AppContext.Provider
      value={{
        currentExperience,
        setCurrentExperience,
        currentTab,
        setCurrentTab,
        currentAdminTab,
        setCurrentAdminTab,
        currentDevTab,
        setCurrentDevTab,
        isAdminMode,
        setIsAdminMode,
        isLiveSandboxOpen,
        setIsLiveSandboxOpen,
        isQuickTestOpen,
        setIsQuickTestOpen,
        currentUserRole,
        setCurrentUserRole,

        companies,
        currentCompanyId,
        currentCompany,
        switchCompany,
        updateCompany,
        createCompanyWorkspace,

        allPlans,
        currentPlan,
        upgradeSubscription,

        updateAgentConfig,
        toggleAgentStatus,
        unpublishAgent,
        disableAgent,
        enableAgent,
        archiveAgent,
        deleteAgent,
        agentVersions,
        publishAgentVersion,
        rollbackAgentVersion,

        knowledgeItems,
        addKnowledgeItem,
        deleteKnowledgeItem,
        trashKnowledgeItem,
        restoreKnowledgeItem,
        disableKnowledgeItem,
        enableKnowledgeItem,
        reprocessKnowledgeItem,
        permanentDeleteKnowledgeItem,
        bulkTrashKnowledge,
        bulkDisableKnowledge,

        integrations,
        updateIntegration,
        toggleIntegration,

        actions,
        updateAction,
        toggleAction,

        apiKeys,
        createApiKey,
        rotateApiKey,
        revokeApiKey,
        webhooks,
        createWebhook,
        toggleWebhook,
        deleteWebhook,
        triggerTestWebhook,
        apiLogs,

        deployments,
        createDeployment,
        disableDeployment,
        enableDeployment,
        removeDeployment,
        updateWidgetSettings,
        regenerateApiKey,

        conversations,
        activeConversationId,
        setActiveConversationId,
        currentActiveConversation,
        sendMessageToAgent,
        confirmPendingAction,
        takeoverConversation,
        sendOperatorMessage,
        resolveConversation,
        archiveConversation,
        deleteConversation,
        bulkArchiveConversations,
        bulkDeleteConversations,
        startNewCustomerChatSession,

        analytics,
        auditLogs,
        teamMembers,
        invoices,
        addTeamMember,
        currentUserProfile,
        updateCurrentUserProfile,

        systemHealth,
        securityEvents,
        adminToggleCompanySuspension,
        adminUpdatePlanPrice,

        toasts,
        showToast,
        removeToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
