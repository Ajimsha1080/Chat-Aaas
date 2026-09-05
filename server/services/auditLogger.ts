/**
 * Immutable Security Audit Logger
 */

import { db } from '../db/database';
import { AuditLogEntity } from '../db/schema';

export class AuditLogger {
  public static log(
    companyId: string,
    actor: string,
    actorRole: string,
    action: string,
    details: string,
    severity: 'info' | 'warning' | 'critical' = 'info',
    ipAddress = '103.21.14.88'
  ): AuditLogEntity {
    const entry: AuditLogEntity = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      companyId,
      timestamp: new Date().toISOString(),
      actor,
      actorRole,
      action,
      details,
      ipAddress,
      severity
    };
    db.auditLogs.push(entry);
    return entry;
  }
}
