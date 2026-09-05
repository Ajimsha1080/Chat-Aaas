/**
 * Typed Frontend API Client for Agent-as-a-Service
 * 
 * Communicates with the backend REST API v1 endpoints with:
 * - Automatic correlation ID propagation
 * - Token management
 * - Draft / Publish / Rollback versioning endpoints
 * - Automated test suite runner
 */

import { APIRouter } from '../../server/routes/apiRouter';
import { TestSuiteRunner, TestResult } from '../../server/tests/runTests';

export class APIClient {
  private static token: string | null = null;
  private static currentCompanyId = 'comp-techflow';

  public static setAuth(token: string | null, companyId: string): void {
    this.token = token;
    this.currentCompanyId = companyId;
  }

  private static async request(path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any) {
    const headers: Record<string, string | undefined> = {
      'x-company-id': this.currentCompanyId,
      'x-correlation-id': `cli-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    };

    if (this.token) {
      headers['authorization'] = `Bearer ${this.token}`;
    }

    const res = await APIRouter.handleRequest({
      path,
      method,
      headers,
      body
    });

    if (res.status >= 400) {
      throw new Error(res.error || `HTTP ${res.status} Error`);
    }

    return res.data;
  }

  // ================= AGENT CONFIG & VERSIONING ================= //
  public static async getAgentConfig() {
    return this.request('/api/v1/agent', 'GET');
  }

  public static async updateDraft(updates: any) {
    return this.request('/api/v1/agent/draft', 'PUT', updates);
  }

  public static async publishDraft(changeSummary?: string) {
    return this.request('/api/v1/agent/publish', 'POST', { changeSummary });
  }

  public static async rollbackVersion(targetVersionId: string) {
    return this.request('/api/v1/agent/rollback', 'POST', { targetVersionId });
  }

  // ================= KNOWLEDGE BASE ================= //
  public static async getKnowledge() {
    return this.request('/api/v1/knowledge', 'GET');
  }

  public static async crawlUrl(url: string, category?: string) {
    return this.request('/api/v1/knowledge/crawl', 'POST', { url, category });
  }

  public static async testSemanticSearch(query: string) {
    return this.request('/api/v1/knowledge/semantic-test', 'POST', { query });
  }

  // ================= TOOLS ================= //
  public static async getTools() {
    return this.request('/api/v1/tools', 'GET');
  }

  public static async executeTool(toolCode: string, args: Record<string, any>, userConfirmed = false) {
    return this.request('/api/v1/tools/execute', 'POST', { toolCode, args, userConfirmed });
  }

  // ================= CONVERSATIONS ================= //
  public static async getConversations() {
    return this.request('/api/v1/conversations', 'GET');
  }

  public static async sendMessage(conversationId: string, text: string, customerName?: string, customerEmail?: string) {
    return this.request('/api/v1/conversations/message', 'POST', { conversationId, text, customerName, customerEmail });
  }

  // ================= BILLING & USAGE ================= //
  public static async getPlans() {
    return this.request('/api/v1/billing/plans', 'GET');
  }

  public static async upgradePlan(planId: string, billingCycle: 'monthly' | 'annual') {
    return this.request('/api/v1/billing/upgrade', 'POST', { planId, billingCycle });
  }

  public static async getUsageSummary() {
    return this.request('/api/v1/usage/summary', 'GET');
  }

  public static async getAuditLogs() {
    return this.request('/api/v1/audit-logs', 'GET');
  }

  // ================= AUTOMATED TEST RUNNER ================= //
  public static async runAutomatedTests(): Promise<{ results: TestResult[]; summary: { total: number; passed: number; failed: number; durationMs: number } }> {
    return TestSuiteRunner.runAllTests();
  }
}
