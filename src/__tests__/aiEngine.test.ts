import { describe, it, expect } from 'vitest';
import { AIAgentEngine } from '../services/aiEngine';
import { Company, KnowledgeItem } from '../types';

describe('AIAgentEngine Frontend Intelligence Suite', () => {
  const mockCompany: Company = {
    id: 'comp_client_test',
    name: 'BrightForge Technologies',
    slug: 'brightforge',
    domain: 'brightforge.io',
    industry: 'Technology',
    createdAt: '2024-01-01T00:00:00Z',
    planId: 'business',
    billingCycle: 'monthly',
    planStatus: 'active',
    currentPeriodStart: '2024-01-01T00:00:00Z',
    currentPeriodEnd: '2024-12-31T00:00:00Z',
    apiKey: 'key_123',
    apiSecretMasked: 'sec_***',
    isSuspended: false,
    stats: {
      totalConversations: 10,
      totalMessages: 50,
      resolvedConversations: 8,
      escalatedConversations: 2,
      messagesThisMonth: 50,
      tokensThisMonth: 1000,
      knowledgeChunksUsed: 5
    },
    widgetSettings: {
      primaryColor: '#6366f1',
      secondaryColor: '#4f46e5',
      headerTitle: 'BrightBot',
      headerSubtitle: 'AI Assistant',
      launcherText: 'Chat with us',
      position: 'bottom_right',
      botAvatar: '',
      userAvatar: '',
      borderRadius: 'rounded-lg',
      showPoweredBy: false,
      enableSound: true,
      autoExpandSeconds: 0
    },
    agent: {
      name: 'BrightBot',
      role: 'Enterprise AI Assistant',
      systemInstructions: 'You are BrightBot, an AI assistant.',
      businessInstructions: '',
      greetingMessage: 'Hello! I am BrightBot.',
      fallbackMessage: 'How can I assist you further?',
      avatarUrl: '',
      description: 'Official enterprise assistant',
      tone: 'professional',
      creativityLevel: 0.3,
      modelTier: 'balanced',
      status: 'active',
      allowedActions: [],
      customSafetyRules: [],
      escalationSettings: {
        enabled: true,
        triggerKeywords: ['talk to human', 'real person'],
        notifyEmail: 'support@brightforge.io',
        maxUnansweredQueriesBeforeEscalation: 3,
        escalationMessage: 'Connecting you to support.',
        requireHumanApprovalForRefund: true
      }
    }
  };

  it('should handle greetings and identity queries naturally', async () => {
    const resGreeting = await AIAgentEngine.processMessage('Hello!', mockCompany, [], [], []);
    expect(resGreeting.message).toContain('BrightBot');

    const resIdentity = await AIAgentEngine.processMessage('Who are you and what do you do?', mockCompany, [], [], []);
    expect(resIdentity.message).toContain('BrightBot');
    expect(resIdentity.message).toContain('BrightForge Technologies');
  });

  it('should ground answers accurately in client knowledge items', async () => {
    const mockKnowledge: KnowledgeItem[] = [
      {
        id: 'k1',
        title: 'Refund Policy',
        type: 'text',
        category: 'Policy',
        content: 'Customers are eligible for a 100% full refund within 30 calendar days of purchase.',
        status: 'indexed',
        chunksCount: 1,
        tokenCount: 20,
        lastUpdated: '2024-01-01T00:00:00Z'
      }
    ];

    const res = await AIAgentEngine.processMessage('What is your refund policy window?', mockCompany, mockKnowledge, [], []);
    expect(res.message).toContain('30');
    expect(res.message.toLowerCase()).toContain('refund');
  });

  it('should trigger human escalation on explicit handoff request', async () => {
    const res = await AIAgentEngine.processMessage('I want to talk to a human agent please', mockCompany, [], [], []);
    expect(res.shouldEscalateToHuman).toBe(true);
  });
});
