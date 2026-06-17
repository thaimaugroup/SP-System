import { z } from "zod";
import { ALLOWED_TARGET_TABLES } from "@/lib/workspaces/config";

export const importUploadSchema = z.object({
  entityId: z.string().uuid(),
  workspaceCode: z.string().min(4),
  targetTable: z.string().refine((value) => ALLOWED_TARGET_TABLES.has(value), "Unsupported target table")
});

export const recordCreateSchema = z.object({
  entity_id: z.string().uuid(),
  strategic_cycle_id: z.string().uuid().nullable().optional(),
  table: z.string().refine((value) => ALLOWED_TARGET_TABLES.has(value), "Unsupported target table"),
  workspace_code: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  data: z.record(z.unknown()).default({}),
  status: z.string().default("draft")
});

export const aiGenerateSchema = z.object({
  entityId: z.string().uuid(),
  workspaceCode: z.string().min(4),
  targetTable: z.string().refine((value) => ALLOWED_TARGET_TABLES.has(value), "Unsupported target table")
});

export const approvalActionSchema = z.object({
  approvalId: z.string().uuid(),
  action: z.enum(["approve", "reject", "edit_and_approve", "request_regeneration"]),
  notes: z.string().optional(),
  editedTitle: z.string().min(1).optional(),
  editedDescription: z.string().optional()
});

export const recordLifecycleSchema = z.object({
  entity_id: z.string().uuid(),
  table: z.string().refine((value) => ALLOWED_TARGET_TABLES.has(value), "Unsupported target table"),
  record_id: z.string().uuid(),
  action: z.enum(["archive", "delete"]),
  reason: z.string().optional()
});

export const importRollbackSchema = z.object({
  batchId: z.string().uuid()
});

export const entityCreateSchema = z.object({
  name: z.string().min(2, "Entity name is required"),
  code: z.string().min(2, "Entity code is required").regex(/^[A-Za-z0-9-]+$/, "Code: letters, numbers, hyphens only"),
  entity_type: z.enum(["business_unit", "subsidiary", "division", "geography", "portfolio", "holding"]).default("business_unit"),
  industry: z.string().optional(),
  geography: z.string().optional(),
  base_currency: z.string().min(3).max(3).default("VND"),
  create_default_cycle: z.boolean().default(true)
});

export const cycleCreateSchema = z.object({
  entity_id: z.string().uuid(),
  name: z.string().min(1, "Cycle name is required"),
  cycle_type: z.enum(["annual", "quarterly", "semi_annual", "custom"]).default("annual"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  complete_current: z.boolean().default(true)
}).refine((d) => d.end_date > d.start_date, { message: "End date must be after start date", path: ["end_date"] });

export const adminUserCreateSchema = z.object({
  entityId: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().min(1),
  title: z.string().optional().nullable(),
  role: z.enum([
    "system_admin", "group_admin", "entity_admin", "workspace_owner", "contributor",
    "reviewer", "approver", "viewer", "import_manager", "ai_operator", "auditor",
    // legacy aliases (still assignable for backward compatibility)
    "owner", "admin", "strategist", "analyst", "department_head", "executive"
  ]),
  temporaryPassword: z.string().min(8).optional()
});
