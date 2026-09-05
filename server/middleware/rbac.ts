/**
 * RBAC Role Authorization Middleware
 */

import { RequestContext } from './tenant';

export type UserRole = 'owner' | 'admin' | 'staff' | 'super_admin';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  staff: 1,
  admin: 2,
  owner: 3,
  super_admin: 4
};

export function checkPermission(context: RequestContext, requiredRole: UserRole): boolean {
  if (context.isSuperAdmin) return true;
  if (!context.userRole) return false;

  const userLevel = ROLE_HIERARCHY[context.userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

export function enforceRole(context: RequestContext, requiredRole: UserRole): void {
  if (!checkPermission(context, requiredRole)) {
    throw new Error(`403 Forbidden: Action requires [${requiredRole}] role or higher. Current role: [${context.userRole || 'anonymous'}]`);
  }
}
