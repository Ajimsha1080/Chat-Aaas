/**
 * Agent-as-a-Service (AaaS) Database Seed Dataset
 * 
 * Provides production-like enterprise seed records for multi-tenant tests and runtime.
 */

import { DatabaseEngine } from './database';

export function initialSeedDatabase(db: DatabaseEngine): void {
  // Clear any existing
  db.users.clear();
  db.companies.clear();
  db.memberships.clear();
  db.agents.clear();
  db.agentVersions.clear();
  db.knowledgeSources.clear();
  db.documentChunks.clear();
  db.integrations.clear();
  db.agentTools.clear();
  db.conversations.clear();
  db.messages.clear();
  db.usageEvents = [];
  db.subscriptions.clear();
  db.invoices.clear();
  db.deploymentConfigs.clear();
  db.auditLogs = [];

  // ================= USERS ================= //
  const user1 = {
    id: 'usr-techflow-owner',
    email: 'alex.morgan@techflow.cloud',
    passwordHash: 'argon2id$v=19$m=65536,t=3,p=4$c2VjdXJlU2FsdDEyMw$demoHashedPasswordAlex',
    fullName: 'Alex Morgan',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isEmailVerified: true,
    mfaEnabled: true,
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-01-15T08:00:00.000Z'
  };

  const user2 = {
    id: 'usr-apex-owner',
    email: 'dr.sarah@apexhealth.io',
    passwordHash: 'argon2id$v=19$m=65536,t=3,p=4$c2VjdXJlU2FsdDEyMw$demoHashedPasswordSarah',
    fullName: 'Dr. Sarah Chen',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    isEmailVerified: true,
    mfaEnabled: false,
    createdAt: '2026-02-01T09:30:00.000Z',
    updatedAt: '2026-02-01T09:30:00.000Z'
  };

  const superAdmin = {
    id: 'usr-super-admin',
    email: 'admin@agent-as-a-service.io',
    passwordHash: 'argon2id$v=19$m=65536,t=3,p=4$c2VjdXJlU2FsdDEyMw$demoSuperAdminHash',
    fullName: 'Platform Super Admin',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    isEmailVerified: true,
    mfaEnabled: true,
    createdAt: '2025-11-01T00:00:00.000Z',
    updatedAt: '2025-11-01T00:00:00.000Z'
  };

  db.users.set(user1.id, user1);
  db.users.set(user2.id, user2);
  db.users.set(superAdmin.id, superAdmin);

  // ================= COMPANIES ================= //
  const comp1 = {
    id: 'comp-techflow',
    name: 'TechFlow Cloud',
    slug: 'techflow-cloud',
    domain: 'techflow.cloud',
    industry: 'DevOps & Cloud Infrastructure',
    planId: 'business' as const,
    billingCycle: 'annual' as const,
    planStatus: 'active' as const,
    currentPeriodStart: '2026-01-01T00:00:00.000Z',
    currentPeriodEnd: '2026-12-31T23:59:59.000Z',
    isSuspended: false,
    apiKey: 'aas_live_techflow_99a81f3b20c9182',
    apiSecretEncrypted: 'enc_kms_sec_techflow_994191',
    webhookUrl: 'https://api.techflow.cloud/webhooks/aaas-events',
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-01-15T08:00:00.000Z'
  };

  const comp2 = {
    id: 'comp-apex',
    name: 'Apex Health Systems',
    slug: 'apex-health',
    domain: 'apexhealth.io',
    industry: 'Healthcare Diagnostics & Telemedicine',
    planId: 'growth' as const,
    billingCycle: 'monthly' as const,
    planStatus: 'active' as const,
    currentPeriodStart: '2026-08-01T00:00:00.000Z',
    currentPeriodEnd: '2026-08-31T23:59:59.000Z',
    isSuspended: false,
    apiKey: 'aas_live_apex_44b12c88f192aa1',
    apiSecretEncrypted: 'enc_kms_sec_apex_110293',
    webhookUrl: 'https://api.apexhealth.io/v1/agent-callback',
    createdAt: '2026-02-01T09:30:00.000Z',
    updatedAt: '2026-02-01T09:30:00.000Z'
  };

  db.companies.set(comp1.id, comp1);
  db.companies.set(comp2.id, comp2);

  // Memberships
  db.memberships.set('mem-1', {
    id: 'mem-1',
    userId: user1.id,
    companyId: comp1.id,
    role: 'owner',
    status: 'active',
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-01-15T08:00:00.000Z'
  });

  db.memberships.set('mem-2', {
    id: 'mem-2',
    userId: user2.id,
    companyId: comp2.id,
    role: 'owner',
    status: 'active',
    createdAt: '2026-02-01T09:30:00.000Z',
    updatedAt: '2026-02-01T09:30:00.000Z'
  });

  // ================= STRICT 1-TO-1 AGENT & VERSIONING ================= //
  // Company 1 Agent
  const agent1 = {
    id: 'agent-techflow-1',
    companyId: comp1.id,
    name: 'Aura Cloud Assistant',
    description: 'Autonomous Tier-1 Cloud Architect & DevOps Support Specialist for TechFlow Cloud.',
    avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    status: 'active' as const,
    tone: 'technical' as const,
    activeVersionId: 'ver-techflow-v2',
    draftVersionId: 'ver-techflow-v2',
    createdAt: '2026-01-15T08:05:00.000Z',
    updatedAt: '2026-08-20T14:10:00.000Z'
  };

  const agent1V1 = {
    id: 'ver-techflow-v1',
    agentId: agent1.id,
    companyId: comp1.id,
    versionNumber: 1,
    status: 'archived' as const,
    systemInstructions: 'You are the official single AI agent for TechFlow Cloud. Answer questions strictly based on indexed documentation.',
    businessInstructions: 'Provide technical answers for AWS, Kubernetes, and Terraform managed services. Escalate billing disputes immediately.',
    greetingMessage: 'Hello! I am Aura from TechFlow Cloud. How can I assist with your Kubernetes or cloud infrastructure today?',
    fallbackMessage: 'I do not have verified technical data on that in our knowledge base. Would you like me to connect you with an on-call Cloud Engineer?',
    tone: 'technical' as const,
    allowedActionIds: ['act-tf-1', 'act-tf-2'],
    escalationSettings: {
      enabled: true,
      triggerKeywords: ['human', 'escalate', 'outage', 'sla breach', 'lawsuit'],
      maxUnansweredQueriesBeforeEscalation: 2,
      notifyEmail: 'cloud-oncall@techflow.cloud',
      escalationMessage: 'Transferring this session to our Senior On-Call SRE immediately.',
      requireHumanApprovalForRefund: true
    },
    customSafetyRules: ['Never disclose internal VPC CIDR blocks.', 'Never fabricate uptime SLA percentages.'],
    changeSummary: 'Initial production release for TechFlow Cloud.',
    publishedByUserId: user1.id,
    publishedAt: '2026-01-15T08:15:00.000Z',
    createdAt: '2026-01-15T08:05:00.000Z'
  };

  const agent1V2 = {
    id: 'ver-techflow-v2',
    agentId: agent1.id,
    companyId: comp1.id,
    versionNumber: 2,
    status: 'published' as const,
    systemInstructions: 'You are the official single AI agent for TechFlow Cloud. Answer questions strictly based on verified company RAG knowledge. Respect high-risk action confirmation guards.',
    businessInstructions: 'Provide technical answers for AWS, Kubernetes, Terraform, and database migrations. Offer interactive confirmation before executing cluster restarts or scaling nodes.',
    greetingMessage: 'Welcome to TechFlow Cloud! I am Aura, your dedicated Cloud DevOps AI. How can I assist your team today?',
    fallbackMessage: 'I cannot find verified SLA documentation for that query in our knowledge base. Would you like me to escalate to our 24/7 SRE support desk?',
    tone: 'technical' as const,
    allowedActionIds: ['act-tf-1', 'act-tf-2', 'act-tf-3'],
    escalationSettings: {
      enabled: true,
      triggerKeywords: ['human', 'escalate', 'outage', 'critical issue', 'urgent help', 'supervisor'],
      maxUnansweredQueriesBeforeEscalation: 2,
      notifyEmail: 'oncall@techflow.cloud',
      escalationMessage: 'Connecting you with an on-call Cloud Solutions Architect.',
      requireHumanApprovalForRefund: true
    },
    customSafetyRules: ['Never output internal server IP addresses.', 'Do not execute node scale operations without confirmation.'],
    changeSummary: 'Added cluster scaling tool and upgraded confirmation prompts.',
    publishedByUserId: user1.id,
    publishedAt: '2026-08-20T14:10:00.000Z',
    createdAt: '2026-08-20T13:45:00.000Z'
  };

  db.agents.set(agent1.id, agent1);
  db.agentVersions.set(agent1V1.id, agent1V1);
  db.agentVersions.set(agent1V2.id, agent1V2);

  // ================= KNOWLEDGE BASE SOURCES & CHUNKS ================= //
  const kb1 = {
    id: 'kb-tf-1',
    companyId: comp1.id,
    type: 'document' as const,
    title: 'Kubernetes SLA & High Availability Architecture Guide',
    fileName: 'TechFlow_K8s_HA_Guide_2026.pdf',
    fileSize: '2.8 MB',
    category: 'Architecture',
    status: 'indexed' as const,
    rawContent: 'TechFlow Cloud guarantees 99.99% multi-region uptime for all Enterprise Kubernetes clusters. Node auto-scaling triggers when cluster CPU exceeds 75% for 3 consecutive minutes. Disaster recovery automated failover RTO is under 45 seconds.',
    chunksCount: 3,
    tokenCount: 420,
    lastIndexedAt: '2026-08-10T10:00:00.000Z',
    createdAt: '2026-08-10T09:50:00.000Z',
    updatedAt: '2026-08-10T10:00:00.000Z'
  };

  const kb2 = {
    id: 'kb-tf-2',
    companyId: comp1.id,
    type: 'faq' as const,
    title: 'Enterprise Billing & Refund SLA',
    category: 'Billing',
    status: 'indexed' as const,
    rawContent: 'Question: What is TechFlow Cloud refund policy?\nAnswer: All annual subscription plans include a 30-day no-questions-asked refund guarantee. Unused reserved compute credits rollover automatically into the subsequent billing quarter.',
    chunksCount: 1,
    tokenCount: 140,
    lastIndexedAt: '2026-08-12T11:00:00.000Z',
    createdAt: '2026-08-12T10:55:00.000Z',
    updatedAt: '2026-08-12T11:00:00.000Z'
  };

  db.knowledgeSources.set(kb1.id, kb1);
  db.knowledgeSources.set(kb2.id, kb2);

  // Document Chunks
  db.documentChunks.set('chunk-tf-1', {
    id: 'chunk-tf-1',
    knowledgeSourceId: kb1.id,
    companyId: comp1.id,
    chunkIndex: 0,
    content: 'TechFlow Cloud guarantees 99.99% multi-region uptime for all Enterprise Kubernetes clusters. Multi-AZ redundant control planes are provisioned across 3 independent availability zones.',
    tokenCount: 140,
    metadata: { title: kb1.title, sourceType: 'document', category: 'Architecture' },
    createdAt: '2026-08-10T10:00:00.000Z'
  });

  db.documentChunks.set('chunk-tf-2', {
    id: 'chunk-tf-2',
    knowledgeSourceId: kb1.id,
    companyId: comp1.id,
    chunkIndex: 1,
    content: 'Node auto-scaling triggers when cluster CPU exceeds 75% for 3 consecutive minutes. Disaster recovery automated failover RTO is under 45 seconds.',
    tokenCount: 140,
    metadata: { title: kb1.title, sourceType: 'document', category: 'Architecture' },
    createdAt: '2026-08-10T10:00:00.000Z'
  });

  db.documentChunks.set('chunk-tf-3', {
    id: 'chunk-tf-3',
    knowledgeSourceId: kb2.id,
    companyId: comp1.id,
    chunkIndex: 0,
    content: 'TechFlow Cloud refund policy: Annual plans have a 30-day money-back guarantee. Unused reserved compute credits roll over automatically into subsequent quarters.',
    tokenCount: 140,
    metadata: { title: kb2.title, sourceType: 'faq', category: 'Billing' },
    createdAt: '2026-08-12T11:00:00.000Z'
  });

  // ================= INTEGRATIONS ================= //
  db.integrations.set('int-tf-1', {
    id: 'int-tf-1',
    companyId: comp1.id,
    name: 'Zendesk Enterprise Support',
    provider: 'zendesk',
    category: 'support',
    description: 'Read ticket status & dispatch priority support tickets directly into engineer queues.',
    connected: true,
    healthStatus: 'healthy',
    accessType: 'read_and_action',
    allowedReadScopes: ['tickets:read', 'users:read'],
    allowedActionScopes: ['tickets:create', 'tickets:escalate'],
    credentialsEncrypted: 'enc_kms_zd_key_9941',
    configFields: [
      { key: 'subdomain', label: 'Zendesk Subdomain', value: 'techflow-help', type: 'text' },
      { key: 'apiKey', label: 'API Token', value: 'zd_tok_••••••••••••8841', type: 'password' }
    ],
    lastSyncAt: '2 mins ago',
    createdAt: '2026-01-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z'
  });

  db.integrations.set('int-tf-2', {
    id: 'int-tf-2',
    companyId: comp1.id,
    name: 'PostgreSQL Production Telemetry',
    provider: 'postgres',
    category: 'database',
    description: 'Query cluster telemetry and resource utilization metrics via read-only replica.',
    connected: true,
    healthStatus: 'healthy',
    accessType: 'read_only',
    allowedReadScopes: ['cluster_telemetry:select', 'health_logs:select'],
    allowedActionScopes: [],
    credentialsEncrypted: 'enc_kms_pg_key_1109',
    configFields: [
      { key: 'host', label: 'DB Host', value: 'db-replica.internal.techflow.cloud', type: 'text' },
      { key: 'port', label: 'Port', value: '5432', type: 'text' },
      { key: 'database', label: 'Database Name', value: 'telemetry_prod', type: 'text' }
    ],
    lastSyncAt: '5 mins ago',
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z'
  });

  // ================= TOOLS / ACTIONS ================= //
  db.agentTools.set('act-tf-1', {
    id: 'act-tf-1',
    companyId: comp1.id,
    code: 'check_cluster_health',
    name: 'Check Cluster Health & Status',
    description: 'Inspects CPU, memory, and pod health status for a specific Kubernetes cluster ID.',
    riskLevel: 'low',
    requiresUserConfirmation: false,
    successMessageTemplate: 'Cluster {clusterId} is healthy (99.98% pod availability, CPU load 41%).',
    integrationProvider: 'PostgreSQL Telemetry',
    enabled: true,
    parameters: [
      { name: 'clusterId', type: 'string', description: 'The unique Kubernetes cluster ID (e.g. cls-prod-9941)', required: true }
    ],
    executionCount: 142,
    createdAt: '2026-01-20T11:00:00.000Z',
    updatedAt: '2026-08-10T11:00:00.000Z'
  });

  db.agentTools.set('act-tf-2', {
    id: 'act-tf-2',
    companyId: comp1.id,
    code: 'create_support_ticket',
    name: 'Create Priority SRE Ticket',
    description: 'Dispatches an urgent support request into Zendesk queue for human engineer investigation.',
    riskLevel: 'medium',
    requiresUserConfirmation: false,
    successMessageTemplate: 'Support ticket #{ticketId} opened. An SRE will contact {email} within 15 minutes.',
    integrationProvider: 'Zendesk Support',
    enabled: true,
    parameters: [
      { name: 'subject', type: 'string', description: 'Brief problem title', required: true },
      { name: 'email', type: 'string', description: 'Customer contact email', required: true },
      { name: 'severity', type: 'string', description: 'P1-Critical or P2-Standard', required: true }
    ],
    executionCount: 88,
    createdAt: '2026-01-20T11:00:00.000Z',
    updatedAt: '2026-08-10T11:00:00.000Z'
  });

  db.agentTools.set('act-tf-3', {
    id: 'act-tf-3',
    companyId: comp1.id,
    code: 'restart_cluster_nodes',
    name: 'Rolling Restart Cluster Nodes',
    description: 'Initiates a graceful rolling restart of Kubernetes worker nodes. High impact.',
    riskLevel: 'high',
    requiresUserConfirmation: true,
    confirmationPrompt: 'Are you sure you want to perform a rolling node restart on cluster {clusterId}? Pods will be gracefully rescheduled.',
    successMessageTemplate: 'Rolling restart initiated for cluster {clusterId}. Estimated completion in 3 minutes.',
    integrationProvider: 'Aura Cloud Controller',
    enabled: true,
    parameters: [
      { name: 'clusterId', type: 'string', description: 'Cluster ID to restart', required: true },
      { name: 'gracePeriodSeconds', type: 'number', description: 'Termination grace period', required: false, defaultValue: 60 }
    ],
    executionCount: 19,
    createdAt: '2026-08-20T14:00:00.000Z',
    updatedAt: '2026-08-20T14:10:00.000Z'
  });

  // ================= CONVERSATIONS & MESSAGES ================= //
  const conv1 = {
    id: 'conv-tf-101',
    companyId: comp1.id,
    customerSessionId: 'sess_live_994812',
    customerName: 'Marcus Vance',
    customerEmail: 'marcus@fintech-global.io',
    channel: 'website_widget' as const,
    status: 'active' as const,
    sentiment: 'neutral' as const,
    totalTokensUsed: 620,
    tags: ['Kubernetes SLA', 'High Availability'],
    startedAt: '2026-08-24T14:20:00.000Z',
    lastMessageAt: '2026-08-24T14:24:00.000Z',
    createdAt: '2026-08-24T14:20:00.000Z',
    updatedAt: '2026-08-24T14:24:00.000Z'
  };

  db.conversations.set(conv1.id, conv1);

  db.messages.set('msg-101-1', {
    id: 'msg-101-1',
    conversationId: conv1.id,
    companyId: comp1.id,
    sender: 'user',
    text: 'Hi there, what is your SLA uptime guarantee for multi-region Kubernetes deployments?',
    tokensUsed: 40,
    createdAt: '2026-08-24T14:20:00.000Z'
  });

  db.messages.set('msg-101-2', {
    id: 'msg-101-2',
    conversationId: conv1.id,
    companyId: comp1.id,
    sender: 'agent',
    senderName: agent1.name,
    text: 'TechFlow Cloud guarantees a **99.99% multi-region uptime SLA** for all Enterprise Kubernetes clusters. Our architecture provisions multi-AZ redundant control planes across 3 independent availability zones with automated disaster recovery failover (RTO under 45 seconds).\n\nWould you like me to check the status of an existing cluster or share our compliance documentation?',
    reasoningSteps: [
      'Level 1: System Guardrails - Checked for prompt injection (Safe).',
      'Level 2: Business Instructions - Verified tone as technical and authoritative.',
      'Level 3: RAG Knowledge - Retrieved chunk "Kubernetes SLA & High Availability Architecture Guide" with 94.2% similarity.',
      'Level 4: Tool check - Low confidence actions not required.',
      'Level 5: Response formulated directly from verified knowledge.'
    ],
    tokensUsed: 280,
    createdAt: '2026-08-24T14:21:00.000Z'
  });

  // ================= DEPLOYMENT CONFIG ================= //
  db.deploymentConfigs.set('dep-comp-1', {
    id: 'dep-comp-1',
    companyId: comp1.id,
    publicWidgetToken: 'pub_live_techflow_wgt_9941a8',
    primaryColor: '#4f46e5',
    secondaryColor: '#0f172a',
    headerTitle: 'TechFlow Cloud Support',
    headerSubtitle: 'AI DevOps Specialist',
    launcherText: 'Chat with DevOps AI',
    position: 'bottom_right',
    botAvatar: agent1.avatarUrl,
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    borderRadius: 'rounded-2xl',
    showPoweredBy: true,
    enableSound: true,
    autoExpandSeconds: 0,
    allowedDomains: ['techflow.cloud', 'app.techflow.cloud', 'localhost'],
    createdAt: '2026-01-15T08:15:00.000Z',
    updatedAt: '2026-08-20T14:10:00.000Z'
  });

  // ================= INVOICES ================= //
  db.invoices.set('inv-tf-1', {
    id: 'inv-tf-1',
    companyId: comp1.id,
    invoiceNumber: 'INV-AAS-2026-8821',
    date: '01 Aug 2026',
    amountINR: 19999,
    planName: 'Business Plan (Annual Billing)',
    status: 'paid',
    gstin: '27AABCT8842K1ZM',
    taxAmountINR: 3599,
    createdAt: '2026-08-01T00:00:00.000Z'
  });

  // ================= AUDIT LOGS ================= //
  db.auditLogs.push({
    id: 'log-1',
    companyId: comp1.id,
    timestamp: '2026-08-20T14:10:00.000Z',
    actor: 'Alex Morgan',
    actorRole: 'owner',
    action: 'AGENT_VERSION_PUBLISHED',
    details: 'Published configuration Version 2.0 with cluster rolling restart tool.',
    ipAddress: '103.21.14.88',
    severity: 'info'
  });

  db.auditLogs.push({
    id: 'log-2',
    companyId: comp1.id,
    timestamp: '2026-08-10T10:00:00.000Z',
    actor: 'Alex Morgan',
    actorRole: 'owner',
    action: 'KNOWLEDGE_INDEXED',
    details: 'Ingested document "TechFlow_K8s_HA_Guide_2026.pdf" (3 chunks, 420 tokens).',
    ipAddress: '103.21.14.88',
    severity: 'info'
  });
}
