/**
 * Usage Metering Service
 * 
 * Append-only auditable event tracking and server-side quota enforcement.
 */

import { db } from '../db/database';
import { UsageEventEntity } from '../db/schema';

export class UsageService {
  public static recordEvent(
    companyId: string,
    eventType: UsageEventEntity['eventType'],
    quantity: number,
    unit: UsageEventEntity['unit'],
    conversationId?: string,
    model = 'gpt-4o'
  ): void {
    const event: UsageEventEntity = {
      id: `use-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      companyId,
      conversationId,
      eventType,
      quantity,
      unit,
      model,
      timestamp: new Date().toISOString()
    };
    db.recordUsage(event);
  }

  public static checkPlanLimit(companyId: string): { withinLimit: boolean; currentMonthMessages: number; maxAllowed: number } {
    const company = db.getCompany(companyId);
    if (!company) return { withinLimit: false, currentMonthMessages: 0, maxAllowed: 0 };

    const maxMap: Record<string, number> = {
      starter: 1000,
      growth: 5000,
      business: 20000,
      enterprise: 100000
    };

    const maxAllowed = maxMap[company.planId] || 5000;
    const summary = db.getUsageSummary(companyId);

    return {
      withinLimit: summary.totalMessages < maxAllowed,
      currentMonthMessages: summary.totalMessages,
      maxAllowed
    };
  }
}
