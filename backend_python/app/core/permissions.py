from typing import Set, Dict, Any

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
        "developer:manage", "team:manage", "company:manage", "integration:manage"
    },
    "admin": {
        "agent:create", "agent:write", "agent:publish", "agent:rollback",
        "knowledge:read", "knowledge:write", "knowledge:delete", "conversation:read", "conversation:takeover",
        "tool:read", "tool:write", "tool:execute", "analytics:read", "audit:readall",
        "developer:manage", "team:manage", "team:invite", "company:manage", "integration:manage"
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
    },
    "api_client": {
        "agent:read", "agent:write",
        "knowledge:read", "knowledge:write", "knowledge:delete",
        "conversation:read", "conversation:write", "conversation:takeover",
        "tool:read", "tool:execute", "analytics:read"
    }
}

def has_permission(role_or_context: Any, permission: str) -> bool:
    if isinstance(role_or_context, str):
        role = role_or_context
        scopes = None
        is_api_key = (role == "api_client")
    else:
        role = getattr(role_or_context, "role", "viewer")
        scopes = getattr(role_or_context, "scopes", None)
        is_api_key = getattr(role_or_context, "is_api_key", False) or (role == "api_client")

    if role in ["super_admin", "platform_super_admin"]:
        return True

    if is_api_key:
        if scopes is not None:
            if "admin:all" in scopes or permission in scopes:
                return True
            perm_prefix = permission.split(":")[0] + ":*"
            if perm_prefix in scopes:
                return True
            return False
        role_perms = ROLE_PERMISSIONS.get("api_client", set())
        return "admin:all" in role_perms or permission in role_perms

    role_perms = ROLE_PERMISSIONS.get(role, set())
    return "admin:all" in role_perms or permission in role_perms
