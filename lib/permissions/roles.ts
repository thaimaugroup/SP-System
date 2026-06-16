export const ROLE_CAPABILITIES = {
  owner: ["read", "create", "edit", "approve", "delete", "import", "rollback", "admin"],
  admin: ["read", "create", "edit", "approve", "delete", "import", "rollback", "admin"],
  strategist: ["read", "create", "edit", "approve", "import", "ai"],
  analyst: ["read", "create", "edit", "import", "ai"],
  department_head: ["read", "create", "edit"],
  executive: ["read"],
  viewer: ["read"]
} as const;

export type SiosRole = keyof typeof ROLE_CAPABILITIES;
export type Capability = (typeof ROLE_CAPABILITIES)[SiosRole][number];

export function roleCan(role: string | null | undefined, capability: Capability) {
  if (!role || !(role in ROLE_CAPABILITIES)) return false;
  return (ROLE_CAPABILITIES[role as SiosRole] as readonly string[]).includes(capability);
}

