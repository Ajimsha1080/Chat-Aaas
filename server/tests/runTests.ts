/**
 * Automated Test Runner Suite for Agent-as-a-Service (AaaS)
 * 
 * Runs Unit, Integration, Security, Cross-Tenant Isolation, SSRF, and Agent Reasoning Tests.
 */

import { db } from '../db/database';
import { APIRouter } from '../routes/apiRouter';
import { validateUrlForCrawler } from '../middleware/security';
import { ToolRegistry } from '../services/toolRegistry';
import { AgentRuntime } from '../services/agentRuntime';

export interface TestResult {
  suite: string;
  testName: string;
  status: 'passed' | 'failed';
  durationMs: number;
  error?: string;
}

export class TestSuiteRunner {
  public static async runAllTests(): Promise<{ results: TestResult[]; summary: { total: number; passed: number; failed: number; durationMs: number } }> {
    const results: TestResult[] = [];
    const overallStart = Date.now();

    // Helper runner
    const runTest = async (suite: string, name: string, fn: () => Promise<void> | void) => {
      const start = Date.now();
      try {
        await fn();
        results.push({
          suite,
          testName: name,
          status: 'passed',
          durationMs: Date.now() - start
        });
      } catch (err: any) {
        results.push({
          suite,
          testName: name,
          status: 'failed',
          durationMs: Date.now() - start,
          error: err.message || String(err)
        });
      }
    };

    // 1. ================= STRICT MULTI-TENANCY & ISOLATION TESTS ================= //
    await runTest('Security: Multi-Tenancy Isolation', 'Tenant A cannot query Tenant B conversations', () => {
      const techflowMessages = db.getMessages('conv-tf-101', 'comp-techflow');
      if (techflowMessages.length === 0) throw new Error('TechFlow messages should exist.');

      // Attempt cross-tenant fetch with apex company ID
      const crossTenantAttempt = db.getMessages('conv-tf-101', 'comp-apex');
      if (crossTenantAttempt.length !== 0) {
        throw new Error('FAIL: Cross-tenant conversation data leaked across company IDs!');
      }
    });

    await runTest('Security: Multi-Tenancy Isolation', 'Tenant A cannot access Tenant B knowledge chunks', () => {
      const apexChunks = db.getDocumentChunksForTenant('comp-apex');
      for (const chunk of apexChunks) {
        if (chunk.companyId !== 'comp-apex') {
          throw new Error('FAIL: Chunks from other companies present in tenant chunk query.');
        }
      }
    });

    // 2. ================= SSRF CRAWLER SECURITY TESTS ================= //
    await runTest('Security: SSRF Protection', 'Crawler rejects localhost, 127.0.0.1, and loopback', () => {
      const res1 = validateUrlForCrawler('http://localhost:8080/admin');
      if (res1.valid) throw new Error('SSRF failed: localhost should be rejected.');

      const res2 = validateUrlForCrawler('http://127.0.0.1:3000/keys');
      if (res2.valid) throw new Error('SSRF failed: 127.0.0.1 should be rejected.');
    });

    await runTest('Security: SSRF Protection', 'Crawler rejects AWS/Cloud metadata IP (169.254.169.254)', () => {
      const res = validateUrlForCrawler('http://169.254.169.254/latest/meta-data/');
      if (res.valid) throw new Error('SSRF failed: Cloud metadata IP was not blocked.');
    });

    await runTest('Security: SSRF Protection', 'Crawler allows public domain URLs', () => {
      const res = validateUrlForCrawler('https://techflow.cloud/docs/pricing');
      if (!res.valid) throw new Error(`Valid URL was incorrectly rejected: ${res.error}`);
    });

    // 3. ================= AGENT PRINCIPLE (STRICT 1-TO-1 AGENT) ================= //
    await runTest('Product Principle: 1 Company = 1 Agent', 'Each company has exactly one active agent instance', () => {
      const comp1Agent = db.getAgentForCompany('comp-techflow');
      if (!comp1Agent) throw new Error('Company 1 must have an agent.');

      const allAgentsForComp1 = Array.from(db.agents.values()).filter(a => a.companyId === 'comp-techflow');
      if (allAgentsForComp1.length !== 1) {
        throw new Error(`FAIL: Company has ${allAgentsForComp1.length} agents. Expected strictly 1.`);
      }
    });

    // 4. ================= DRAFT -> PUBLISH -> ROLLBACK VERSIONING TESTS ================= //
    await runTest('Agent Versioning Lifecycle', 'Publishing draft creates new immutable version number', async () => {
      const agent = db.getAgentForCompany('comp-techflow')!;
      const initialVersion = db.getActiveAgentVersion(agent.id)!;

      // Update draft
      await APIRouter.handleRequest({
        path: '/api/v1/agent/draft',
        method: 'PUT',
        headers: { 'x-company-id': 'comp-techflow' },
        body: { greetingMessage: 'Updated Draft Greeting!' }
      });

      // Publish
      const publishRes = await APIRouter.handleRequest({
        path: '/api/v1/agent/publish',
        method: 'POST',
        headers: { 'x-company-id': 'comp-techflow' },
        body: { changeSummary: 'Automated test publish' }
      });

      if (publishRes.status !== 200) throw new Error('Failed to publish version.');
      const newActive = db.getActiveAgentVersion(agent.id)!;
      if (newActive.versionNumber <= initialVersion.versionNumber) {
        throw new Error('Version number was not incremented.');
      }

      // Rollback to initial version
      const rollbackRes = await APIRouter.handleRequest({
        path: '/api/v1/agent/rollback',
        method: 'POST',
        headers: { 'x-company-id': 'comp-techflow' },
        body: { targetVersionId: initialVersion.id }
      });

      if (rollbackRes.status !== 200) throw new Error('Failed to rollback version.');
      const rolledBack = db.getActiveAgentVersion(agent.id)!;
      if (rolledBack.id !== initialVersion.id) {
        throw new Error('Active version was not restored to initial version.');
      }
    });

    // 5. ================= TOOL SCHEMA & HIGH-RISK CONFIRMATION GUARDS ================= //
    await runTest('Tool Execution Layer', 'Schema validation catches missing required parameters', () => {
      const tool = db.agentTools.get('act-tf-1')!;
      const validation = ToolRegistry.validateArguments(tool, {}); // Missing clusterId
      if (validation.valid) throw new Error('Validation should have failed for missing required parameter.');
    });

    await runTest('Tool Execution Layer', 'High-risk tools require explicit user confirmation before executing', () => {
      const result = ToolRegistry.executeTool('comp-techflow', 'restart_cluster_nodes', { clusterId: 'cls-prod-9941' }, false);
      if (result.status !== 'requires_confirmation') {
        throw new Error(`Expected 'requires_confirmation' status, got '${result.status}'.`);
      }

      // Confirmed run
      const confirmedResult = ToolRegistry.executeTool('comp-techflow', 'restart_cluster_nodes', { clusterId: 'cls-prod-9941' }, true);
      if (confirmedResult.status !== 'success') {
        throw new Error(`Expected 'success' status after confirmation, got '${confirmedResult.status}'.`);
      }
    });

    // 6. ================= ANTI-HALLUCINATION & RAG GROUNDING TESTS ================= //
    await runTest('Agent Runtime: Anti-Hallucination', 'Agent provides grounded response when knowledge matches', async () => {
      const res = await AgentRuntime.processMessage('comp-techflow', 'conv-test-1', 'What is the Kubernetes SLA guarantee?');
      if (!res.message.includes('99.99%')) {
        throw new Error('Agent failed to retrieve SLA guarantee from knowledge base.');
      }
    });

    await runTest('Agent Runtime: Anti-Hallucination', 'Agent executes safe fallback when knowledge is unavailable', async () => {
      const res = await AgentRuntime.processMessage('comp-techflow', 'conv-test-2', 'What is the corporate cafeteria lunch menu on Mars?');
      if (!res.message.toLowerCase().includes('knowledge base') && !res.message.toLowerCase().includes('verified')) {
        throw new Error('Agent did not trigger anti-hallucination fallback for unverified topic.');
      }
    });

    await runTest('Agent Runtime: Safe Human Handoff', 'Trigger keywords initiate human handoff', async () => {
      const res = await AgentRuntime.processMessage('comp-techflow', 'conv-test-3', 'I need a human supervisor right now for a critical issue!');
      if (!res.shouldEscalateToHuman) {
        throw new Error('Agent failed to trigger human escalation on keyword.');
      }
    });

    // 7. ================= USAGE METERING & BILLING INTEGRITY ================= //
    await runTest('Billing & Usage Metering', 'Append-only usage events correctly aggregate metrics', () => {
      const initialSummary = db.getUsageSummary('comp-techflow');
      db.recordUsage({
        id: `test-use-${Date.now()}`,
        companyId: 'comp-techflow',
        eventType: 'token_consumption',
        quantity: 500,
        unit: 'tokens',
        timestamp: new Date().toISOString()
      });

      const updatedSummary = db.getUsageSummary('comp-techflow');
      if (updatedSummary.totalTokens !== initialSummary.totalTokens + 500) {
        throw new Error('Usage meter did not correctly aggregate token consumption.');
      }
    });

    // 8. ================= PYTHON AI CLIENT & HYBRID RAG TESTS ================= //
    await runTest('Python AI Hybrid Client', 'Circuit breaker resilience & graceful local fallback', async () => {
      const { pythonAiClient } = await import('../services/pythonAiClient');
      const state = pythonAiClient.getCircuitState();
      if (state !== 'CLOSED' && state !== 'HALF_OPEN' && state !== 'OPEN') {
        throw new Error(`Invalid circuit state: ${state}`);
      }

      // Test rerank fallback
      const rerankRes = await pythonAiClient.rerank(
        'Kubernetes SLA guarantee',
        [
          { id: '1', content: 'Random unrelated note about snacks' },
          { id: '2', content: 'Our enterprise cluster guarantees 99.99% uptime SLA.' }
        ],
        'comp-techflow',
        2
      );

      if (rerankRes.length !== 2 || rerankRes[0].id !== '2') {
        throw new Error('Hybrid rerank fallback failed to rank most relevant chunk first.');
      }
    });

    await runTest('Python AI Hybrid Client', 'NLP classification detects intent and sentiment', async () => {
      const { pythonAiClient } = await import('../services/pythonAiClient');
      const res = await pythonAiClient.classify('URGENT: Requesting full refund for order #123');
      if (!res.success || !res.intent.includes('refund')) {
        throw new Error('NLP classifier failed to detect refund intent.');
      }
    });

    const totalDuration = Date.now() - overallStart;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return {
      results,
      summary: {
        total: results.length,
        passed,
        failed,
        durationMs: totalDuration
      }
    };
  }
}
