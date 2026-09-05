from typing import Set, Dict

ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    "super_admin": {
        "admin:all", "org:all", "agent:readall", "agent:create", "agent:write", "agent:publish", "agent:rollback",
        "knowledge:read", "knowledge:write", "conversation:readall", "conversation:takeover",
        "tool:read", "tool:write", "tool:execute", "billing:manage", "analytics:read", "audit:read",
        "developer:manage"
    },
    "owner": {
        "agent:create", "agent:write", "agent:publish", "agent:rollback",
        "knowledge:read", "knowledge:write", "conversation:read", "conversation:takeover",
        "tool:read", "tool:write", "tool:execute", "billing:manage", "analytics:read", "audit:readall",
        "developer:manage", "team:manage"
    },
    "admin": {
        "agent:create", "agent:write", "agent:publish", "agent:rollback",
        "knowledge:read", "knowledge:write", "conversation:read", "conversation:takeover",
        "tool:read", "tool:write", "tool:execute", "analytics:read", "audit:readall",
        "developer:manage", "team:invite"
    },
    "manager": {
        "agent:read", "agent:write",
        "knowledge:readall", "knowledge:write", "conversation:readall", "conversation:takeover",
        "tool:read", "analytics:read", "audit:read"
    },
    "staff": {
        "agent:read", "knowledge:read", "conversation:read", "conversation:takeover",
        "tool:readall", "analytics:read"
    },
    "developer": {
        "agent:read", "agent:write", "agent:publish", "knowledge:read",
        "tool:read", "tool:write", "developer:manage", "analytics:read", "audit:read"
    },
    "viewer": {
        "agent:readall", "knowledge:readall", "conversation:readall", "analytics:read"
    }
}

def has_permission(role: str, permission: str) -> bool:
    role_perms = ROLE_PERMISSIONS.get(role, set())
    return "admin:all" in role_perms or permission in role_perms
