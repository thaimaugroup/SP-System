// RBAC capability model — implements the PRD §10.2 permission matrix.
//
// Two layers enforce permissions:
//   1. API layer (this map via roleCan): fine-grained per-action gating in route
//      handlers — create / edit / approve / reject / import / rollback / ai / admin.
//   2. RLS layer (private.user_can_mutate_entity / user_can_view_record): coarse
//      tenant + entity isolation, and read-only roles (viewer, executive, auditor).
//
// All 11 PRD roles are defined. The original 7 implementation roles are kept as
// legacy aliases so pre-existing accounts and seed data keep working.

export const ROLE_CAPABILITIES = {
  // ── PRD §10.1 roles ───────────────────────────────────────────────────────
  system_admin: ["read", "create", "edit", "delete", "approve", "reject", "ai", "import", "rollback", "admin", "view_audit"],
  group_admin: ["read", "create", "edit", "delete", "approve", "reject", "ai", "import", "rollback", "admin", "view_audit"],
  entity_admin: ["read", "create", "edit", "delete", "approve", "reject", "ai", "import", "rollback", "admin", "view_audit"],
  workspace_owner: ["read", "create", "edit", "delete", "approve", "reject", "ai", "import", "rollback"],
  contributor: ["read", "create", "edit", "ai"],
  reviewer: ["read", "edit", "approve", "reject", "view_audit"],
  approver: ["read", "approve", "reject", "view_audit"],
  viewer: ["read"],
  import_manager: ["read", "import", "rollback", "view_audit"],
  ai_operator: ["read", "ai"],
  auditor: ["read", "view_audit"],

  // ── legacy implementation roles (aliases, kept for existing accounts) ───────
  owner: ["read", "create", "edit", "delete", "approve", "reject", "ai", "import", "rollback", "admin", "view_audit"],
  admin: ["read", "create", "edit", "delete", "approve", "reject", "ai", "import", "rollback", "admin", "view_audit"],
  strategist: ["read", "create", "edit", "approve", "reject", "ai", "import"],
  analyst: ["read", "create", "edit", "ai", "import"],
  department_head: ["read", "create", "edit"],
  executive: ["read", "view_audit"]
} as const;

export type SiosRole = keyof typeof ROLE_CAPABILITIES;
export type Capability =
  | "read"
  | "create"
  | "edit"
  | "delete"
  | "approve"
  | "reject"
  | "ai"
  | "import"
  | "rollback"
  | "admin"
  | "view_audit";

export function roleCan(role: string | null | undefined, capability: Capability) {
  if (!role || !(role in ROLE_CAPABILITIES)) return false;
  return (ROLE_CAPABILITIES[role as SiosRole] as readonly string[]).includes(capability);
}

// Human-readable label for a role (for UI badges / messages).
export function roleLabel(role: string | null | undefined): string {
  if (!role) return "No role";
  return role.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
