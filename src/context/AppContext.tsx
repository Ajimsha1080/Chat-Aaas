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
  SubscriptionPlanId,
  AgentConfig,
  WidgetCustomization,
  AgentTone,
  ToastNotification
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
  INITIAL_ANALYTICS 
} from '../data/mockData';
import { AIAgentEngine } from '../services/aiEngine';
import { AppContext } from './AppContextDefinition';

const LOCAL_STORAGE_KEY = 'aaas_platform_state_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation
  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isLiveSandboxOpen, setIsLiveSandboxOpen] = useState<boolean>(false);
  const [isQuickTestOpen, setIsQuickTestOpen] = useState<boolean>(false);
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin' | 'support_agent' | 'platform_super_admin'>('owner');

  // Multi-tenant Entities
  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_companies`);
    return saved ? JSON.parse(saved) : INITIAL_COMPANIES;
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
    return saved ? JSON.parse(saved) : INITIAL_KNOWLEDGE;
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
    return saved ? JSON.parse(saved) : INITIAL_CONVERSATIONS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_audit`);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(INITIAL_TEAM);
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

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_companies`, JSON.stringify(companies));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_plans`, JSON.stringify(allPlans));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_knowledge`, JSON.stringify(knowledgeMap));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_integrations`, JSON.stringify(integrationsMap));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_actions`, JSON.stringify(actionsMap));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_conversations`, JSON.stringify(conversationsMap));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_audit`, JSON.stringify(auditLogs));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [companies, allPlans, knowledgeMap, integrationsMap, actionsMap, conversationsMap, auditLogs]);

  // Derived current states
  const currentCompany = companies.find(c => c.id === currentCompanyId) || companies[0];
  const currentPlan = allPlans.find(p => p.id === currentCompany.planId) || allPlans[0];
  const knowledgeItems = knowledgeMap[currentCompanyId] || [];
  const integrations = integrationsMap[currentCompanyId] || [];
  const actions = actionsMap[currentCompanyId] || [];
  const conversations = conversationsMap[currentCompanyId] || [];

  const currentActiveConversation = conversations.find(c => c.id === activeConversationId) || conversations[0] || null;

  // Logging helper
  const addAuditLog = (action: string, details: string, severity: 'info' | 'warning' | 'critical' = 'info') => {
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: currentUserRole === 'platform_super_admin' ? 'Platform Super Admin' : `${currentCompany.name} Admin`,
      actorRole: currentUserRole,
      action,
      details,
      ipAddress: '103.21.14.88',
      severity
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const switchCompany = (companyId: string) => {
    if (companies.some(c => c.id === companyId)) {
      setCurrentCompanyId(companyId);
      setActiveConversationId(null);
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
    const newId = `comp-${Date.now().toString(36)}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    const newCompany: Company = {
      id: newId,
      name,
      slug,
      domain,
      industry,
      createdAt: new Date().toISOString(),
      planId,
      billingCycle: 'monthly',
      planStatus: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isSuspended: false,
      apiKey: `aas_live_${slug}_${Math.random().toString(36).substring(2, 10)}`,
      apiSecretMasked: 'aas_sec_••••••••••••••••' + Math.random().toString(36).substring(2, 6),
      webhookUrl: `https://api.${domain}/webhooks/agent`,
      stats: {
        totalConversations: 0,
        totalMessages: 0,
        resolvedConversations: 0,
        escalatedConversations: 0,
        messagesThisMonth: 0,
        tokensThisMonth: 0,
        knowledgeChunksUsed: 0
      },
      agent: {
        name: agentName || `${name} AI Agent`,
        status: 'active',
        avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        description: `Official AI Agent for ${name}. Helps customers with product questions, inquiries, and authorized actions.`,
        tone,
        creativityLevel: 0.2,
        systemInstructions: `You are the official single AI agent for ${name}. Rely strictly on company knowledge and connected tools. If unsure, gracefully offer human support.`,
        businessInstructions: `Welcome users politely. Handle inquiries about ${industry}. Respect high-risk action confirmation guards.`,
        greetingMessage: `Hello! Welcome to ${name}. How may I help you today?`,
        fallbackMessage: `I do not have verified information on that in our knowledge base. Would you like to speak with our support team?`,
        allowedActions: [],
        escalationSettings: {
          enabled: true,
          triggerKeywords: ['human', 'escalate', 'urgent', 'agent', 'helpdesk'],
          maxUnansweredQueriesBeforeEscalation: 2,
          notifyEmail: `support@${domain}`,
          escalationMessage: 'Transferring you to a live support representative now.',
          requireHumanApprovalForRefund: true
        },
        customSafetyRules: ['Never fabricate policies or financial figures.']
      },
      widgetSettings: {
        primaryColor: '#4f46e5',
        secondaryColor: '#0f172a',
        headerTitle: `${name} Support`,
        headerSubtitle: 'AI Assistant',
        launcherText: 'Chat with Us',
        position: 'bottom_right',
        botAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        borderRadius: 'rounded-2xl',
        showPoweredBy: true,
        enableSound: true,
        autoExpandSeconds: 0
      }
    };

    setCompanies(prev => [...prev, newCompany]);
    setKnowledgeMap(prev => ({ ...prev, [newId]: [] }));
    setIntegrationsMap(prev => ({ ...prev, [newId]: [] }));
    setActionsMap(prev => ({ ...prev, [newId]: [] }));
    setConversationsMap(prev => ({ ...prev, [newId]: [] }));

    setCurrentCompanyId(newId);
    addAuditLog('WORKSPACE_CREATED', `Created new company workspace: "${name}" on ${planId} plan.`);
    showToast('Workspace Created', `Company workspace "${name}" created on ${planId.toUpperCase()} plan.`, 'success');
    return newId;
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
    addAuditLog('AGENT_CONFIG_UPDATED', `Updated single agent profile & tone configurations.`);
    showToast('Agent Saved', 'AI Agent profile & behavior configuration updated.', 'success');
  };

  const toggleAgentStatus = () => {
    const nextStatus = currentCompany.agent.status === 'active' ? 'paused' : 'active';
    setCompanies(prev => prev.map(c => {
      if (c.id === currentCompanyId) {
        return {
          ...c,
          agent: { ...c.agent, status: nextStatus }
        };
      }
      return c;
    }));
    addAuditLog('AGENT_STATUS_TOGGLED', `Changed agent status to "${nextStatus.toUpperCase()}"`, nextStatus === 'paused' ? 'warning' : 'info');
    showToast(nextStatus === 'active' ? 'Agent Resumed' : 'Agent Paused', `Single AI Agent is now ${nextStatus}.`, nextStatus === 'active' ? 'success' : 'warning');
  };

  const addKnowledgeItem = (item: Partial<KnowledgeItem> & { title: string; content: string; type: KnowledgeItem['type'] }) => {
    const wordCount = item.content.split(/\s+/).length;
    const chunks = Math.max(1, Math.ceil(wordCount / 60));
    const tokens = Math.round(wordCount * 1.35);

    const newItem: KnowledgeItem = {
      id: `kb-${Date.now()}`,
      type: item.type,
      title: item.title,
      sourceUrl: item.sourceUrl,
      fileName: item.fileName,
      fileSize: item.fileSize || '1.2 MB',
      content: item.content,
      status: 'indexed',
      chunksCount: chunks,
      tokenCount: tokens,
      lastUpdated: new Date().toISOString(),
      category: item.category || 'General',
      faqAnswer: item.faqAnswer
    };

    setKnowledgeMap(prev => {
      const existing = prev[currentCompanyId] || [];
      return { ...prev, [currentCompanyId]: [newItem, ...existing] };
    });

    // Increment company stats
    setCompanies(prev => prev.map(c => {
      if (c.id === currentCompanyId) {
        return {
          ...c,
          stats: {
            ...c.stats,
            knowledgeChunksUsed: c.stats.knowledgeChunksUsed + chunks
          }
        };
      }
      return c;
    }));

    addAuditLog('KNOWLEDGE_INDEXED', `Ingested "${newItem.title}" (${chunks} chunks, ${tokens} tokens)`);
    showToast('Knowledge Ingested', `"${newItem.title}" was vectorized and indexed.`, 'success');
  };

  const deleteKnowledgeItem = (id: string) => {
    setKnowledgeMap(prev => {
      const existing = prev[currentCompanyId] || [];
      const itemToDelete = existing.find(k => k.id === id);
      if (itemToDelete) {
        addAuditLog('KNOWLEDGE_DELETED', `Deleted knowledge item: "${itemToDelete.title}"`);
        showToast('Document Deleted', `"${itemToDelete.title}" removed from knowledge base.`, 'info');
      }
      return {
        ...prev,
        [currentCompanyId]: existing.filter(k => k.id !== id)
      };
    });
  };

  const updateIntegration = (id: string, updates: Partial<Integration>) => {
    setIntegrationsMap(prev => {
      const list = prev[currentCompanyId] || [];
      return {
        ...prev,
        [currentCompanyId]: list.map(item => item.id === id ? { ...item, ...updates } : item)
      };
    });
    addAuditLog('INTEGRATION_CONFIG_UPDATED', `Modified credentials/scopes for integration ID: ${id}`);
    showToast('Integration Updated', 'Integration settings and scopes saved.', 'success');
  };

  const toggleIntegration = (id: string) => {
    setIntegrationsMap(prev => {
      const list = prev[currentCompanyId] || [];
      return {
        ...prev,
        [currentCompanyId]: list.map(item => {
          if (item.id === id) {
            const nextConnected = !item.connected;
            addAuditLog(
              nextConnected ? 'INTEGRATION_CONNECTED' : 'INTEGRATION_DISCONNECTED',
              `${nextConnected ? 'Connected' : 'Disconnected'} integration: "${item.name}"`
            );
            showToast(nextConnected ? 'Integration Connected' : 'Integration Disconnected', `Status for "${item.name}" updated.`, nextConnected ? 'success' : 'warning');
            return {
              ...item,
              connected: nextConnected,
              healthStatus: nextConnected ? 'healthy' : 'disconnected',
              lastSyncAt: nextConnected ? 'Just now' : item.lastSyncAt
            };
          }
          return item;
        })
      };
    });
  };

  const updateAction = (id: string, updates: Partial<ActionDefinition>) => {
    setActionsMap(prev => {
      const list = prev[currentCompanyId] || [];
      return {
        ...prev,
        [currentCompanyId]: list.map(act => act.id === id ? { ...act, ...updates } : act)
      };
    });
    addAuditLog('ACTION_UPDATED', `Updated action parameters/confirmation settings for ID: ${id}`);
    showToast('Action Updated', 'Tool execution parameters & permissions saved.', 'success');
  };

  const toggleAction = (id: string) => {
    setActionsMap(prev => {
      const list = prev[currentCompanyId] || [];
      return {
        ...prev,
        [currentCompanyId]: list.map(act => {
          if (act.id === id) {
            const nextEnabled = !act.enabled;
            // Also sync to agent.allowedActions
            setCompanies(cList => cList.map(c => {
              if (c.id === currentCompanyId) {
                const currentAllowed = c.agent.allowedActions;
                const newAllowed = nextEnabled
                  ? [...currentAllowed, id]
                  : currentAllowed.filter(aId => aId !== id);
                return { ...c, agent: { ...c.agent, allowedActions: newAllowed } };
              }
              return c;
            }));

            addAuditLog('ACTION_STATUS_TOGGLED', `${nextEnabled ? 'Enabled' : 'Disabled'} approved action: "${act.name}"`);
            showToast(nextEnabled ? 'Action Enabled' : 'Action Disabled', `AI tool "${act.name}" is now ${nextEnabled ? 'active' : 'disabled'}.`, nextEnabled ? 'success' : 'info');
            return { ...act, enabled: nextEnabled };
          }
          return act;
        })
      };
    });
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
    addAuditLog('WIDGET_BRANDING_UPDATED', `Updated widget appearance and deployment settings.`);
    showToast('Widget Branding Saved', 'Live floating widget styles and settings deployed.', 'success');
  };

  const regenerateApiKey = () => {
    const newKey = `aas_live_${currentCompany.slug}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    setCompanies(prev => prev.map(c => {
      if (c.id === currentCompanyId) {
        return { ...c, apiKey: newKey };
      }
      return c;
    }));
    addAuditLog('API_KEY_ROTATED', `Regenerated live API key for tenant "${currentCompany.name}"`, 'warning');
    showToast('API Key Rotated', 'New live production API key generated.', 'warning');
  };

  const startNewCustomerChatSession = (initialGreeting = true): string => {
    const newConvId = `conv-${Date.now().toString(36)}`;
    const initialMessages: Message[] = [];

    if (initialGreeting) {
      initialMessages.push({
        id: `msg-init-${Date.now()}`,
        sender: 'agent',
        senderName: currentCompany.agent.name,
        text: currentCompany.agent.greetingMessage,
        timestamp: new Date().toISOString()
      });
    }

    const newConversation: Conversation = {
      id: newConvId,
      companyId: currentCompanyId,
      customerName: 'Website Visitor',
      customerEmail: 'visitor@session.io',
      channel: 'website_widget',
      startedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      status: 'active',
      sentiment: 'neutral',
      tags: ['Website Live Session'],
      totalTokensUsed: 120,
      messages: initialMessages
    };

    setConversationsMap(prev => {
      const existing = prev[currentCompanyId] || [];
      return { ...prev, [currentCompanyId]: [newConversation, ...existing] };
    });

    setActiveConversationId(newConvId);
    showToast('New Chat Session', `Started new session for ${currentCompany.agent.name}.`, 'info');
    return newConvId;
  };

  const sendMessageToAgent = async (conversationId: string, text: string) => {
    const targetConv = (conversationsMap[currentCompanyId] || []).find(c => c.id === conversationId);
    if (!targetConv) return;

    const userMessage: Message = {
      id: `msg-u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };

    // Update conversation with user message first
    setConversationsMap(prev => {
      const list = prev[currentCompanyId] || [];
      return {
        ...prev,
        [currentCompanyId]: list.map(c => {
          if (c.id === conversationId) {
            return {
              ...c,
              lastMessageAt: new Date().toISOString(),
              messages: [...c.messages, userMessage]
            };
          }
          return c;
        })
      };
    });

    // Check if conversation is in human takeover mode
    if (targetConv.status === 'escalated_to_human' && targetConv.assignedOperator) {
      // In takeover mode, do not auto-reply with agent. Notify operator.
      return;
    }

    // Process through AI Agent Engine
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
      id: `msg-a-${Date.now()}`,
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
      const list = prev[currentCompanyId] || [];
      return {
        ...prev,
        [currentCompanyId]: list.map(c => {
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

    // Update company metrics
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
      
      // Increment action counter
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
      id: `msg-conf-${Date.now()}`,
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

  const takeoverConversation = (conversationId: string, operatorName = 'Support Agent (You)') => {
    setConversationsMap(prev => {
      const list = prev[currentCompanyId] || [];
      return {
        ...prev,
        [currentCompanyId]: list.map(c => {
          if (c.id === conversationId) {
            return {
              ...c,
              status: 'escalated_to_human',
              assignedOperator: operatorName
            };
          }
          return c;
        })
      };
    });

    addAuditLog('HUMAN_TAKEOVER_INITIATED', `Human operator (${operatorName}) took over conversation ID: ${conversationId}`, 'warning');
    showToast('Live Takeover Active', `Human operator (${operatorName}) took over session.`, 'warning');
  };

  const sendOperatorMessage = (conversationId: string, text: string) => {
    const operatorMessage: Message = {
      id: `msg-op-${Date.now()}`,
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

    // Real-time simulated customer response after 2.5 seconds
    setTimeout(() => {
      const replies = [
        "Thank you so much! That resolved my issue completely.",
        "Got it, appreciate the quick clarification from your team!",
        "Understood! Thank you for the guidance.",
        "That's very helpful, thank you!"
      ];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      const custMsg: Message = {
        id: `msg-u-${Date.now()}`,
        sender: 'user',
        text: reply,
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
                sentiment: 'positive',
                messages: [...c.messages, custMsg]
              };
            }
            return c;
          })
        };
      });

      showToast('Customer Reply', `Visitor replied: "${reply}"`, 'info');
    }, 2500);
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

    addAuditLog('CONVERSATION_RESOLVED', `Marked conversation ID ${conversationId} as RESOLVED.`);
    showToast('Conversation Resolved', 'Session marked as resolved and archived.', 'success');
  };

  const upgradeSubscription = (planId: SubscriptionPlanId, cycle: 'monthly' | 'annual') => {
    setCompanies(prev => prev.map(c => {
      if (c.id === currentCompanyId) {
        return {
          ...c,
          planId,
          billingCycle: cycle,
          planStatus: 'active'
        };
      }
      return c;
    }));

    const targetPlan = allPlans.find(p => p.id === planId);
    const amount = cycle === 'annual' ? (targetPlan?.priceAnnualINR || 0) * 12 : (targetPlan?.priceMonthlyINR || 0);

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      number: `INV-AAS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      amountINR: amount,
      planName: `${targetPlan?.name || 'Subscription'} (${cycle === 'annual' ? 'Annual' : 'Monthly'})`,
      status: 'paid'
    };

    setInvoices(prev => [newInvoice, ...prev]);
    addAuditLog('SUBSCRIPTION_PLAN_CHANGED', `Changed subscription tier to ${planId.toUpperCase()} (${cycle})`);
    showToast('Plan Upgraded', `Subscribed to ${planId.toUpperCase()} plan (${cycle}). Invoice generated.`, 'success');
  };

  const addTeamMember = (name: string, email: string, role: TeamMember['role']) => {
    const newMember: TeamMember = {
      id: `tm-${Date.now()}`,
      name,
      email,
      role,
      status: 'active',
      lastActive: 'Just invited'
    };
    setTeamMembers(prev => [...prev, newMember]);
    addAuditLog('TEAM_MEMBER_INVITED', `Invited ${email} as ${role}`);
    showToast('Invitation Sent', `Invite email sent to ${email} as ${role}.`, 'success');
  };

  const adminToggleCompanySuspension = (companyId: string) => {
    setCompanies(prev => prev.map(c => {
      if (c.id === companyId) {
        const nextSuspended = !c.isSuspended;
        addAuditLog(
          nextSuspended ? 'COMPANY_SUSPENDED' : 'COMPANY_ACTIVATED',
          `Platform Admin ${nextSuspended ? 'suspended' : 're-activated'} company: "${c.name}"`,
          'critical'
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
        currentTab,
        setCurrentTab,
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
        createCompanyWorkspace,

        allPlans,
        currentPlan,
        upgradeSubscription,

        updateAgentConfig,
        toggleAgentStatus,

        knowledgeItems,
        addKnowledgeItem,
        deleteKnowledgeItem,

        integrations,
        updateIntegration,
        toggleIntegration,

        actions,
        updateAction,
        toggleAction,

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
        startNewCustomerChatSession,

        analytics,
        auditLogs,
        teamMembers,
        invoices,
        addTeamMember,

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




