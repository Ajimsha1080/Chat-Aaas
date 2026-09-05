/**
 * Master API v1 Router & Dispatcher
 * 
 * Unified REST API Gateway handling authentication, tenant isolation,
 * error handling, and structured JSON responses.
 */

import { db } from '../db/database';
import { resolveTenant } from '../middleware/tenant';
import { AgentController } from './agentRoutes';
import { RAGEngine } from '../services/ragEngine';
import { CrawlerService } from '../services/crawlerService';
import { ToolRegistry } from '../services/toolRegistry';
import { AgentRuntime } from '../services/agentRuntime';
import { BillingService, PLANS_CATALOG } from '../services/billingService';
import { UsageService } from '../services/usageService';
import { AuditLogger } from '../services/auditLogger';
import { createJwtToken, verifyPassword, hashPassword } from '../middleware/auth';
import { enforceRole } from '../middleware/rbac';
import { MessageEntity } from '../db/schema';

export interface APIRequest {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string | undefined>;
  body?: any;
  query?: Record<string, string | undefined>;
}

export interface APIResponse {
  status: number;
  data?: any;
  error?: string;
  meta?: {
    correlationId: string;
    timestamp: string;
  };
}

export class APIRouter {
  public static async handleRequest(req: APIRequest): Promise<APIResponse> {
    const context = resolveTenant(req.headers);
    const timestamp = new Date().toISOString();

    try {
      const { path, method, body = {}, query: _query = {} } = req;

      // ================= AUTH ROUTES ================= //
      if (path === '/api/v1/auth/login' && method === 'POST') {
        const { email, password } = body;
        const user = Array.from(db.users.values()).find(u => u.email.toLowerCase() === (email || '').toLowerCase());
        if (!user || !verifyPassword(password, user.passwordHash)) {
          return { status: 401, error: 'Invalid email or password credentials.', meta: { correlationId: context.correlationId, timestamp } };
        }

        const membership = Array.from(db.memberships.values()).find(m => m.userId === user.id);
        const companyId = membership?.companyId || 'comp-techflow';
        const role = membership?.role || 'owner';
        const token = createJwtToken(user.id, companyId, role);

        return {
          status: 200,
          data: {
            user: { id: user.id, email: user.email, fullName: user.fullName, avatarUrl: user.avatarUrl },
            companyId,
            role,
            token
          },
          meta: { correlationId: context.correlationId, timestamp }
        };
      }

      if (path === '/api/v1/auth/signup' && method === 'POST') {
        const { fullName, email, password, companyName, industry, planId = 'starter' } = body;
        const newUserId = `usr-${Date.now().toString(36)}`;
        const newCompId = `comp-${Date.now().toString(36)}`;

        const newUser = {
          id: newUserId,
          email,
          passwordHash: hashPassword(password),
          fullName,
          isEmailVerified: true,
          mfaEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const newCompany = {
          id: newCompId,
          name: companyName,
          slug: companyName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          domain: `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          industry: industry || 'Technology',
          planId: planId as any,
          billingCycle: 'monthly' as const,
          planStatus: 'active' as const,
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
          isSuspended: false,
          apiKey: `aas_live_${newCompId}_${Math.random().toString(36).substring(2, 10)}`,
          apiSecretEncrypted: `enc_kms_sec_${newCompId}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Create single agent for company
        const newAgentId = `agent-${newCompId}`;
        const newVersionId = `ver-${newCompId}-v1`;

        const newAgentVersion = {
          id: newVersionId,
          agentId: newAgentId,
          companyId: newCompId,
          versionNumber: 1,
          status: 'published' as const,
          systemInstructions: `You are the official single AI agent for ${companyName}. Rely strictly on verified knowledge.`,
          businessInstructions: `Help users with ${industry} inquiries politely.`,
          greetingMessage: `Hello! Welcome to ${companyName}. How may I help you?`,
          fallbackMessage: `I don't have verified information on that. Would you like me to connect you with support?`,
          tone: 'professional' as const,
          allowedActionIds: [],
          escalationSettings: {
            enabled: true,
            triggerKeywords: ['human', 'escalate', 'urgent', 'supervisor'],
            maxUnansweredQueriesBeforeEscalation: 2,
            notifyEmail: `support@${newCompany.domain}`,
            escalationMessage: 'Transferring you to a live support representative.',
            requireHumanApprovalForRefund: true
          },
          customSafetyRules: ['Never fabricate policies or figures.'],
          publishedByUserId: newUserId,
          publishedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };

        const newAgent = {
          id: newAgentId,
          companyId: newCompId,
          name: `${companyName} AI Agent`,
          description: `Official AI Agent for ${companyName}.`,
          avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
          status: 'active' as const,
          tone: 'professional' as const,
          activeVersionId: newVersionId,
          draftVersionId: newVersionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        db.users.set(newUserId, newUser);
        db.companies.set(newCompId, newCompany);
        db.agents.set(newAgentId, newAgent);
        db.agentVersions.set(newVersionId, newAgentVersion);
        db.memberships.set(`mem-${newUserId}`, {
          id: `mem-${newUserId}`,
          userId: newUserId,
          companyId: newCompId,
          role: 'owner',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        const token = createJwtToken(newUserId, newCompId, 'owner');
        return {
          status: 201,
          data: { user: newUser, company: newCompany, agent: newAgent, token },
          meta: { correlationId: context.correlationId, timestamp }
        };
      }

      // ================= AGENT ROUTES ================= //
      if (path === '/api/v1/agent' && method === 'GET') {
        const data = AgentController.getAgent(context);
        return { status: 200, data, meta: { correlationId: context.correlationId, timestamp } };
      }

      if (path === '/api/v1/agent/draft' && method === 'PUT') {
        const data = AgentController.updateDraft(context, body);
        return { status: 200, data, meta: { correlationId: context.correlationId, timestamp } };
      }

      if (path === '/api/v1/agent/publish' && method === 'POST') {
        const data = AgentController.publishDraft(context, body.changeSummary);
        return { status: 200, data, meta: { correlationId: context.correlationId, timestamp } };
      }

      if (path === '/api/v1/agent/rollback' && method === 'POST') {
        const data = AgentController.rollbackVersion(context, body.targetVersionId);
        return { status: 200, data, meta: { correlationId: context.correlationId, timestamp } };
      }

      // ================= KNOWLEDGE BASE ROUTES ================= //
      if (path === '/api/v1/knowledge' && method === 'GET') {
        const sources = db.getKnowledgeSources(context.companyId!);
        return { status: 200, data: { sources }, meta: { correlationId: context.correlationId, timestamp } };
      }

      if (path === '/api/v1/knowledge/crawl' && method === 'POST') {
        enforceRole(context, 'admin');
        const result = await CrawlerService.crawlUrl(context.companyId!, body.url, body.category);
        if (!result.success) {
          return { status: 400, error: result.error, meta: { correlationId: context.correlationId, timestamp } };
        }
        return { status: 201, data: result, meta: { correlationId: context.correlationId, timestamp } };
      }

      if (path === '/api/v1/knowledge/semantic-test' && method === 'POST') {
        const results = RAGEngine.searchTenantKnowledge(context.companyId!, body.query, 5, 0.1);
        return { status: 200, data: { results }, meta: { correlationId: context.correlationId, timestamp } };
      }

      // ================= TOOLS ROUTES ================= //
      if (path === '/api/v1/tools' && method === 'GET') {
        const tools = db.getAgentTools(context.companyId!);
        return { status: 200, data: { tools }, meta: { correlationId: context.correlationId, timestamp } };
      }

      if (path === '/api/v1/tools/execute' && method === 'POST') {
        const result = ToolRegistry.executeTool(context.companyId!, body.toolCode, body.args || {}, body.userConfirmed || false);
        return { status: 200, data: result, meta: { correlationId: context.correlationId, timestamp } };
      }

      // ================= CONVERSATIONS & CHAT ENGINE ================= //
      if (path === '/api/v1/conversations' && method === 'GET') {
        const conversations = db.getConversations(context.companyId!);
        return { status: 200, data: { conversations }, meta: { correlationId: context.correlationId, timestamp } };
      }

      if (path === '/api/v1/conversations/message' && method === 'POST') {
        const { conversationId, text } = body;
        const companyId = context.companyId!;

        let conversation = db.conversations.get(conversationId);
        if (!conversation || conversation.companyId !== companyId) {
          // Create new conversation on the fly
          const newConvId = conversationId || `conv-${Date.now().toString(36)}`;
          conversation = {
            id: newConvId,
            companyId,
            customerSessionId: `sess_${Date.now()}`,
            customerName: body.customerName || 'Website Visitor',
            customerEmail: body.customerEmail || 'visitor@session.io',
            channel: 'website_widget',
            status: 'active',
            sentiment: 'neutral',
            totalTokensUsed: 120,
            tags: ['Live Widget'],
            startedAt: new Date().toISOString(),
            lastMessageAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          db.conversations.set(newConvId, conversation);
        }

        // Add user message
        const userMsgId = `msg-u-${Date.now()}`;
        const userMsg: MessageEntity = {
          id: userMsgId,
          conversationId: conversation.id,
          companyId,
          sender: 'user',
          text,
          tokensUsed: Math.round(text.length / 4),
          createdAt: new Date().toISOString()
        };
        db.messages.set(userMsgId, userMsg);

        // Process through Agent Runtime
        const history = db.getMessages(conversation.id, companyId);
        const runtimeResult = await AgentRuntime.processMessage(companyId, conversation.id, text, history);

        // Add agent response message
        const agentMsgId = `msg-a-${Date.now()}`;
        const agentMsg: MessageEntity = {
          id: agentMsgId,
          conversationId: conversation.id,
          companyId,
          sender: 'agent',
          text: runtimeResult.message,
          reasoningSteps: runtimeResult.reasoningSteps,
          toolTraces: runtimeResult.toolTraces,
          isPendingConfirmation: runtimeResult.isPendingConfirmation,
          pendingActionData: runtimeResult.pendingActionData,
          tokensUsed: 350,
          createdAt: new Date().toISOString()
        };
        db.messages.set(agentMsgId, agentMsg);

        conversation.lastMessageAt = new Date().toISOString();
        if (runtimeResult.shouldEscalateToHuman) {
          conversation.status = 'escalated_to_human';
          conversation.sentiment = 'urgent';
          conversation.assignedOperator = 'On-Call Staff';
        }

        UsageService.recordEvent(companyId, 'message', 2, 'count', conversation.id);
        UsageService.recordEvent(companyId, 'token_consumption', 400, 'tokens', conversation.id);

        return {
          status: 200,
          data: {
            conversation,
            userMessage: userMsg,
            agentMessage: agentMsg
          },
          meta: { correlationId: context.correlationId, timestamp }
        };
      }

      // ================= BILLING & USAGE ROUTES ================= //
      if (path === '/api/v1/billing/plans' && method === 'GET') {
        return { status: 200, data: { plans: PLANS_CATALOG }, meta: { correlationId: context.correlationId, timestamp } };
      }

      if (path === '/api/v1/billing/upgrade' && method === 'POST') {
        enforceRole(context, 'owner');
        const { planId, billingCycle } = body;
        const result = BillingService.changePlan(context.companyId!, planId, billingCycle);
        AuditLogger.log(context.companyId!, context.userId || 'Owner', 'owner', 'SUBSCRIPTION_UPGRADED', `Changed tier to ${planId.toUpperCase()} (${billingCycle})`);
        return { status: 200, data: result, meta: { correlationId: context.correlationId, timestamp } };
      }

      if (path === '/api/v1/usage/summary' && method === 'GET') {
        const summary = db.getUsageSummary(context.companyId!);
        const limitCheck = UsageService.checkPlanLimit(context.companyId!);
        return { status: 200, data: { summary, limitCheck }, meta: { correlationId: context.correlationId, timestamp } };
      }

      // ================= AUDIT LOGS ================= //
      if (path === '/api/v1/audit-logs' && method === 'GET') {
        const logs = db.getAuditLogs(context.companyId!);
        return { status: 200, data: { logs }, meta: { correlationId: context.correlationId, timestamp } };
      }

      return { status: 404, error: `Endpoint '${method} ${path}' not found.`, meta: { correlationId: context.correlationId, timestamp } };
    } catch (err: any) {
      return {
        status: err.message.startsWith('403') ? 403 : 500,
        error: err.message || 'Internal Server Error',
        meta: { correlationId: context.correlationId, timestamp }
      };
    }
  }
}
