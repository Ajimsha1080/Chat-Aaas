from typing import Set, Dict

ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    "super_admin": {
        "admin:all", "org:all", "agent:readall", "agent:create", "agent:write", "agent:publish", "agent:rollback",
        "knowledge:read", "knowledge:write", "knowledge:delete", "conversation:readall", "conversation:takeover",
        "tool:read", "tool:write", "tool:execute", "billing:manage", "analytics:read", "audit:read",
        "developer:manage", "team:manage", "company:manage"
    },
    "owner": {
        "agent:create", "agent:write", "agent:publish", "agent:rollback",
        "knowledge:read", "knowledge:write", "knowledge:delete", "conversation:read", "conversation:takeover",
        "tool:read", "tool:write", "tool:execute", "billing:manage", "analytics:read", "audit:readall",
        "developer:manage", "team:manage", "company:manage"
    },
    "admin": {
        "agent:create", "agent:write", "agent:publish", "agent:rollback",
        "knowledge:read", "knowledge:write", "knowledge:delete", "conversation:read", "conversation:takeover",
        "tool:read", "tool:write", "tool:execute", "analytics:read", "audit:readall",
        "developer:manage", "team:invite", "company:manage"
    },
    "agent_editor": {
        "agent:read", "agent:write",
        "knowledge:read", "knowledge:write", "conversation:read",
        "tool:read", "analytics:read", "audit:read"
    },
    "support_lead": {
        "agent:read", "knowledge:read", "conversation:read", "conversation:readall", "conversation:takeover",
        "tool:read", "tool:execute", "analytics:read"
    },
    "viewer": {
        "agent:read", "agent:readall", "knowledge:read", "knowledge:readall", "conversation:read", "conversation:readall", "analytics:read"
    }
}

def has_permission(role: str, permission: str) -> bool:
    role_perms = ROLE_PERMISSIONS.get(role, set())
    return "admin:all" in role_perms or permission in role_perms
