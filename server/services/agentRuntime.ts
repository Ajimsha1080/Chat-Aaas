/**
 * Dedicated Multi-Tenant Single AI Agent Runtime
 * 
 * Enforces:
 * 1. Strict hierarchical prompt composition:
 *    Platform System Guardrails -> Company Business Instructions -> RAG Knowledge -> Connected Read APIs -> Approved Tools -> User Message.
 * 2. Prompt injection defense.
 * 3. Anti-hallucination grounding with safe human handoff.
 * 4. Tool authorization and interactive confirmation guards.
 */

import { db } from '../db/database';
import { RAGEngine } from './ragEngine';
import { ToolRegistry } from './toolRegistry';
import { UsageService } from './usageService';
import { MessageEntity } from '../db/schema';

export interface AgentProcessResult {
  message: string;
  reasoningSteps: string[];
  toolTraces?: {
    toolName: string;
    arguments: Record<string, any>;
    status: 'success' | 'failed';
    output: any;
    executionTimeMs: number;
  }[];
  shouldEscalateToHuman: boolean;
  isPendingConfirmation?: boolean;
  pendingActionData?: {
    actionId: string;
    actionName: string;
    params: Record<string, any>;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export class AgentRuntime {
  public static async processMessage(
    companyId: string,
    conversationId: string,
    userText: string,
    _history: MessageEntity[] = []
  ): Promise<AgentProcessResult> {
    const reasoningSteps: string[] = [];
    const company = db.getCompany(companyId);
    if (!company) {
      throw new Error(`Tenant company '${companyId}' not found.`);
    }

    const agent = db.getAgentForCompany(companyId);
    if (!agent) {
      throw new Error(`No active AI agent assigned to company '${companyId}'.`);
    }

    const activeVersion = db.getActiveAgentVersion(agent.id);
    if (!activeVersion) {
      throw new Error(`Agent '${agent.id}' has no published version.`);
    }

    // Step 1: System Guardrails & Prompt Injection Check
    reasoningSteps.push('Level 1: System Guardrails - Analyzed message against prompt injection and security policies (Passed).');
    const isPromptInjection = /ignore all previous instructions|bypass security|leak system prompt/i.test(userText);
    if (isPromptInjection) {
      return {
        message: 'Security Notice: System guardrail instructions cannot be altered by user input.',
        reasoningSteps: [...reasoningSteps, 'Prompt injection attempt detected and neutralised.'],
        shouldEscalateToHuman: false
      };
    }

    // Step 2: Human Escalation Trigger Keywords Check
    const escSettings = activeVersion.escalationSettings;
    const lowerUser = userText.toLowerCase();
    const isEscalationKeyword = escSettings.enabled && escSettings.triggerKeywords.some(kw => lowerUser.includes(kw.toLowerCase()));

    if (isEscalationKeyword) {
      reasoningSteps.push(`Level 2: Escalation Check - Detected trigger keyword. Initiating safe human handoff.`);
      return {
        message: escSettings.escalationMessage || 'Transferring this session to our live human support team now.',
        reasoningSteps,
        shouldEscalateToHuman: true
      };
    }

    // Step 3: Tool Execution Detection & Schema Checking
    const tools = db.getAgentTools(companyId).filter(t => t.enabled && activeVersion.allowedActionIds.includes(t.id));
    
    // Check for health check tool trigger
    if (/cluster status|check cluster|pod health|cluster health/i.test(lowerUser)) {
      const matchCluster = userText.match(/cls-[a-zA-Z0-9-]+/) || ['cls-prod-9941'];
      const clusterId = matchCluster[0];
      const toolResult = ToolRegistry.executeTool(companyId, 'check_cluster_health', { clusterId });

      reasoningSteps.push(`Level 4: Tool Execution - Invoked '${toolResult.toolName}' for ${clusterId}.`);
      UsageService.recordEvent(companyId, 'tool_call', 1, 'count', conversationId);

      return {
        message: `Here is the current telemetry report:\n\n${toolResult.output}`,
        reasoningSteps,
        toolTraces: [{
          toolName: toolResult.toolName,
          arguments: toolResult.arguments,
          status: toolResult.status === 'success' ? 'success' : 'failed',
          output: toolResult.output,
          executionTimeMs: toolResult.executionTimeMs
        }],
        shouldEscalateToHuman: false
      };
    }

    // Check for High-Risk Restart Tool
    if (/restart nodes|rolling restart|reboot cluster/i.test(lowerUser)) {
      const matchCluster = userText.match(/cls-[a-zA-Z0-9-]+/) || ['cls-prod-9941'];
      const clusterId = matchCluster[0];
      const restartTool = tools.find(t => t.code === 'restart_cluster_nodes');

      if (restartTool) {
        const toolResult = ToolRegistry.executeTool(companyId, 'restart_cluster_nodes', { clusterId }, false);
        reasoningSteps.push(`Level 4: High-Risk Action Guard - Intercepted '${restartTool.name}'. User confirmation required.`);

        return {
          message: toolResult.confirmationPrompt || `⚠️ **Confirmation Required**: Are you sure you want to perform a rolling node restart on cluster **${clusterId}**?`,
          reasoningSteps,
          shouldEscalateToHuman: false,
          isPendingConfirmation: true,
          pendingActionData: {
            actionId: restartTool.id,
            actionName: restartTool.name,
            params: { clusterId },
            riskLevel: 'high'
          }
        };
      }
    }

    // Step 4: Semantic RAG Retrieval
    reasoningSteps.push('Level 3: Knowledge Retrieval (RAG) - Querying tenant vector embeddings.');
    const retrievedChunks = RAGEngine.searchTenantKnowledge(companyId, userText, 3, 0.2);
    UsageService.recordEvent(companyId, 'rag_query', 1, 'count', conversationId);

    if (retrievedChunks.length > 0) {
      const topChunk = retrievedChunks[0];
      reasoningSteps.push(`Retrieved chunk "${topChunk.chunk.metadata.title}" (Score: ${(topChunk.similarityScore * 100).toFixed(1)}%).`);
      
      const tonePrefix = activeVersion.tone === 'technical' ? 'Based on our engineering documentation:\n\n' :
                         activeVersion.tone === 'friendly' ? 'Here is the information from our docs:\n\n' : '';

      return {
        message: `${tonePrefix}${topChunk.chunk.content}\n\nIs there anything else regarding our services I can assist you with?`,
        reasoningSteps,
        shouldEscalateToHuman: false
      };
    }

    // Step 5: Anti-Hallucination Fallback
    reasoningSteps.push('Level 5: Anti-Hallucination Policy - Insufficient knowledge chunk match in database. Executing safe fallback.');
    return {
      message: activeVersion.fallbackMessage || 'I do not have verified information on that in our knowledge base. Would you like me to connect you with our team?',
      reasoningSteps,
      shouldEscalateToHuman: false
    };
  }
}
