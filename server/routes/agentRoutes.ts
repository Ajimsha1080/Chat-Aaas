/**
 * Agent Configuration & Versioning API Routes (/api/v1/agent)
 * 
 * Strict Single-Agent Constraint with:
 * - Draft editing
 * - Test simulation
 * - Version publishing
 * - Instant rollback to previous versions
 * - Historical change logs
 */

import { db } from '../db/database';
import { RequestContext } from '../middleware/tenant';
import { enforceRole } from '../middleware/rbac';
import { AuditLogger } from '../services/auditLogger';
import { AgentVersionEntity } from '../db/schema';

export class AgentController {
  public static getAgent(context: RequestContext) {
    const companyId = context.companyId!;
    const agent = db.getAgentForCompany(companyId);
    if (!agent) {
      throw new Error(`404: No AI agent found for company '${companyId}'.`);
    }

    const activeVersion = db.getActiveAgentVersion(agent.id);
    const draftVersion = db.getDraftAgentVersion(agent.id);
    const versions = db.getAgentVersions(agent.id, companyId);

    return {
      agent,
      activeVersion,
      draftVersion,
      versions
    };
  }

  public static updateDraft(context: RequestContext, updates: Partial<AgentVersionEntity>) {
    enforceRole(context, 'admin');
    const companyId = context.companyId!;
    const agent = db.getAgentForCompany(companyId);
    if (!agent) throw new Error(`404: Agent not found.`);

    const draft = db.getDraftAgentVersion(agent.id);
    if (!draft) throw new Error(`404: Draft version not found.`);

    Object.assign(draft, updates);
    return { draft };
  }

  public static publishDraft(context: RequestContext, changeSummary?: string) {
    enforceRole(context, 'admin');
    const companyId = context.companyId!;
    const agent = db.getAgentForCompany(companyId);
    if (!agent) throw new Error(`404: Agent not found.`);

    const draft = db.getDraftAgentVersion(agent.id);
    if (!draft) throw new Error(`404: Draft version not found.`);

    const currentVersions = db.getAgentVersions(agent.id, companyId);
    const nextVersionNumber = Math.max(...currentVersions.map(v => v.versionNumber), 1) + 1;

    // Archive current active version
    const currentActive = db.getActiveAgentVersion(agent.id);
    if (currentActive) {
      currentActive.status = 'archived';
    }

    // Create new published version
    const newVersionId = `ver-${agent.id}-v${nextVersionNumber}`;
    const newPublishedVersion: AgentVersionEntity = {
      ...draft,
      id: newVersionId,
      versionNumber: nextVersionNumber,
      status: 'published',
      changeSummary: changeSummary || `Published Version ${nextVersionNumber}.0`,
      publishedByUserId: context.userId,
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    db.agentVersions.set(newVersionId, newPublishedVersion);
    agent.activeVersionId = newVersionId;
    agent.draftVersionId = newVersionId; // Draft syncs to published

    AuditLogger.log(
      companyId,
      context.userId || 'Admin',
      context.userRole || 'admin',
      'AGENT_VERSION_PUBLISHED',
      `Published Agent Configuration Version ${nextVersionNumber}.0: ${changeSummary || 'No summary'}`,
      'info'
    );

    return {
      success: true,
      publishedVersion: newPublishedVersion
    };
  }

  public static rollbackVersion(context: RequestContext, targetVersionId: string) {
    enforceRole(context, 'admin');
    const companyId = context.companyId!;
    const agent = db.getAgentForCompany(companyId);
    if (!agent) throw new Error(`404: Agent not found.`);

    const targetVersion = db.agentVersions.get(targetVersionId);
    if (!targetVersion || targetVersion.companyId !== companyId) {
      throw new Error(`404: Target version '${targetVersionId}' not found for this tenant.`);
    }

    // Update active version pointer
    agent.activeVersionId = targetVersion.id;
    agent.draftVersionId = targetVersion.id;

    AuditLogger.log(
      companyId,
      context.userId || 'Admin',
      context.userRole || 'admin',
      'AGENT_VERSION_ROLLBACK',
      `Rolled back Agent Configuration to Version ${targetVersion.versionNumber}.0 (${targetVersion.id})`,
      'warning'
    );

    return {
      success: true,
      activeVersion: targetVersion
    };
  }
}
