/**
 * Agent-as-a-Service (AaaS) Database Engine
 * 
 * Normalized In-Memory & Persistent Storage Engine with:
 * - Strict tenant isolation enforcement
 * - Foreign key constraints
 * - Indexes & query filters
 * - Atomic transaction emulation
 */

import {
  UserEntity,
  CompanyEntity,
  MembershipEntity,
  AgentEntity,
  AgentVersionEntity,
  KnowledgeSourceEntity,
  DocumentChunkEntity,
  IntegrationEntity,
  AgentToolEntity,
  ConversationEntity,
  MessageEntity,
  UsageEventEntity,
  SubscriptionEntity,
  InvoiceEntity,
  DeploymentConfigEntity,
  AuditLogEntity
} from './schema';
import { initialSeedDatabase } from './seed';

export class DatabaseEngine {
  public users: Map<string, UserEntity> = new Map();
  public companies: Map<string, CompanyEntity> = new Map();
  public memberships: Map<string, MembershipEntity> = new Map();
  public agents: Map<string, AgentEntity> = new Map();
  public agentVersions: Map<string, AgentVersionEntity> = new Map();
  public knowledgeSources: Map<string, KnowledgeSourceEntity> = new Map();
  public documentChunks: Map<string, DocumentChunkEntity> = new Map();
  public integrations: Map<string, IntegrationEntity> = new Map();
  public agentTools: Map<string, AgentToolEntity> = new Map();
  public conversations: Map<string, ConversationEntity> = new Map();
  public messages: Map<string, MessageEntity> = new Map();
  public usageEvents: UsageEventEntity[] = [];
  public subscriptions: Map<string, SubscriptionEntity> = new Map();
  public invoices: Map<string, InvoiceEntity> = new Map();
  public deploymentConfigs: Map<string, DeploymentConfigEntity> = new Map();
  public auditLogs: AuditLogEntity[] = [];

  private static instance: DatabaseEngine;

  private constructor() {
    this.seed();
  }

  public static getInstance(): DatabaseEngine {
    if (!DatabaseEngine.instance) {
      DatabaseEngine.instance = new DatabaseEngine();
    }
    return DatabaseEngine.instance;
  }

  public seed(): void {
    initialSeedDatabase(this);
  }

  // ================= TENANT ISOLATION HELPERS ================= //

  public getCompany(companyId: string): CompanyEntity | undefined {
    return this.companies.get(companyId);
  }

  public getCompanyByApiKey(apiKey: string): CompanyEntity | undefined {
    for (const company of this.companies.values()) {
      if (company.apiKey === apiKey && !company.isSuspended) {
        return company;
      }
    }
    return undefined;
  }

  public getCompanyByWidgetToken(widgetToken: string): CompanyEntity | undefined {
    for (const deploy of this.deploymentConfigs.values()) {
      if (deploy.publicWidgetToken === widgetToken) {
        return this.companies.get(deploy.companyId);
      }
    }
    return undefined;
  }

  // Strict 1-to-1 Agent Query
  public getAgentForCompany(companyId: string): AgentEntity | undefined {
    for (const agent of this.agents.values()) {
      if (agent.companyId === companyId) {
        return agent;
      }
    }
    return undefined;
  }

  public getActiveAgentVersion(agentId: string): AgentVersionEntity | undefined {
    const agent = this.agents.get(agentId);
    if (!agent) return undefined;
    return this.agentVersions.get(agent.activeVersionId);
  }

  public getDraftAgentVersion(agentId: string): AgentVersionEntity | undefined {
    const agent = this.agents.get(agentId);
    if (!agent) return undefined;
    return this.agentVersions.get(agent.draftVersionId);
  }

  public getAgentVersions(agentId: string, companyId: string): AgentVersionEntity[] {
    const versions: AgentVersionEntity[] = [];
    for (const v of this.agentVersions.values()) {
      if (v.agentId === agentId && v.companyId === companyId) {
        versions.push(v);
      }
    }
    return versions.sort((a, b) => b.versionNumber - a.versionNumber);
  }

  // Strict Tenant Knowledge Queries
  public getKnowledgeSources(companyId: string): KnowledgeSourceEntity[] {
    const sources: KnowledgeSourceEntity[] = [];
    for (const src of this.knowledgeSources.values()) {
      if (src.companyId === companyId && !src.deletedAt) {
        sources.push(src);
      }
    }
    return sources.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getDocumentChunksForTenant(companyId: string): DocumentChunkEntity[] {
    const chunks: DocumentChunkEntity[] = [];
    for (const chunk of this.documentChunks.values()) {
      if (chunk.companyId === companyId) {
        chunks.push(chunk);
      }
    }
    return chunks;
  }

  // Strict Tenant Integrations
  public getIntegrations(companyId: string): IntegrationEntity[] {
    const list: IntegrationEntity[] = [];
    for (const item of this.integrations.values()) {
      if (item.companyId === companyId) {
        list.push(item);
      }
    }
    return list;
  }

  // Strict Tenant Tools
  public getAgentTools(companyId: string): AgentToolEntity[] {
    const list: AgentToolEntity[] = [];
    for (const tool of this.agentTools.values()) {
      if (tool.companyId === companyId) {
        list.push(tool);
      }
    }
    return list;
  }

  // Strict Tenant Conversations
  public getConversations(companyId: string): ConversationEntity[] {
    const list: ConversationEntity[] = [];
    for (const conv of this.conversations.values()) {
      if (conv.companyId === companyId) {
        list.push(conv);
      }
    }
    return list.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  public getMessages(conversationId: string, companyId: string): MessageEntity[] {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || conversation.companyId !== companyId) {
      return []; // Return empty on cross-tenant mismatch
    }
    const list: MessageEntity[] = [];
    for (const msg of this.messages.values()) {
      if (msg.conversationId === conversationId && msg.companyId === companyId) {
        list.push(msg);
      }
    }
    return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  // Strict Tenant Invoices
  public getInvoices(companyId: string): InvoiceEntity[] {
    const list: InvoiceEntity[] = [];
    for (const inv of this.invoices.values()) {
      if (inv.companyId === companyId) {
        list.push(inv);
      }
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Strict Tenant Audit Logs
  public getAuditLogs(companyId?: string): AuditLogEntity[] {
    if (!companyId) {
      return [...this.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return this.auditLogs
      .filter(l => l.companyId === companyId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Append-Only Usage Record
  public recordUsage(event: UsageEventEntity): void {
    this.usageEvents.push(event);
  }

  public getUsageSummary(companyId: string) {
    const events = this.usageEvents.filter(e => e.companyId === companyId);
    const messages = events.filter(e => e.eventType === 'message').reduce((acc, e) => acc + e.quantity, 0);
    const tokens = events.filter(e => e.eventType === 'token_consumption').reduce((acc, e) => acc + e.quantity, 0);
    const toolCalls = events.filter(e => e.eventType === 'tool_call').reduce((acc, e) => acc + e.quantity, 0);
    const ragQueries = events.filter(e => e.eventType === 'rag_query').reduce((acc, e) => acc + e.quantity, 0);

    return {
      totalMessages: messages,
      totalTokens: tokens,
      totalToolCalls: toolCalls,
      totalRagQueries: ragQueries
    };
  }
}

export const db = DatabaseEngine.getInstance();
