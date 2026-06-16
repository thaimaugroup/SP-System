export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RecordStatus =
  | "draft"
  | "import_staged"
  | "ai_draft"
  | "ready_for_review"
  | "approved"
  | "rejected"
  | "archived"
  | "superseded"
  | string;

export type SiosEntity = {
  id: string;
  group_id: string;
  name: string;
  code: string;
  industry: string | null;
  geography: string | null;
  base_currency: string;
  status: string;
};

export type StrategicCycle = {
  id: string;
  entity_id: string;
  name: string;
  cycle_type: string;
  start_date: string;
  end_date: string;
  status: string;
};

export type WorkspaceRegistryRow = {
  id: string;
  workspace_code: string;
  workspace_name: string;
  sequence: number;
  purpose: string;
  supports_ai: boolean;
  supports_import: boolean;
  status: string;
};

export type WorkspaceStatusRow = {
  id: string;
  entity_id: string;
  strategic_cycle_id: string | null;
  workspace_code: string;
  status: string;
  completion_percent: number;
  data_readiness_score: number;
  pending_approvals: number;
  stale_links: number;
};

export type BusinessRecord = {
  id: string;
  entity_id: string;
  strategic_cycle_id: string | null;
  title: string | null;
  description: string | null;
  data: Record<string, Json>;
  source_type: string;
  import_batch_id: string | null;
  ai_run_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  status: RecordStatus;
  version: number;
};

export type WorkspaceLink = {
  id: string;
  entity_id: string;
  source_workspace_code: string | null;
  source_table: string;
  source_record_id: string;
  source_record_version: number | null;
  target_workspace_code: string | null;
  target_table: string;
  target_record_id: string;
  target_record_version: number | null;
  link_type: string;
  link_strength: number | null;
  metadata: Record<string, Json>;
  created_at: string;
  // Enriched at query time: true when the linked upstream record now has a higher
  // version than the one captured on this link (PRD §13.2 stale-source warning).
  is_stale?: boolean;
  current_source_version?: number | null;
};

export type ImportBatch = {
  id: string;
  entity_id: string;
  workspace_code: string | null;
  target_table: string | null;
  status: string;
  row_count: number;
  valid_row_count: number;
  error_row_count: number;
  committed_row_count: number;
  created_at: string;
};

