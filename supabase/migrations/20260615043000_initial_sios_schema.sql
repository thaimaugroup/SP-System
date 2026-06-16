-- SIOS initial Supabase schema
-- Project: Strategic Intelligence Operating System

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists vector with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email extensions.citext not null unique,
  full_name text not null,
  title text,
  avatar_url text,
  default_entity_id uuid,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  base_currency char(3) not null default 'USD',
  fiscal_year_start_month integer not null default 1 check (fiscal_year_start_month between 1 and 12),
  status text not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entities (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  parent_entity_id uuid references public.entities(id),
  name text not null,
  code text not null,
  entity_type text not null default 'business_unit',
  industry text,
  geography text,
  base_currency char(3) not null default 'USD',
  status text not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, code)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_default_entity_fk'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_default_entity_fk
      foreign key (default_entity_id) references public.entities(id);
  end if;
end $$;

create table if not exists public.divisions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  name text not null,
  code text,
  leader_user_id uuid references public.profiles(id),
  status text not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  division_id uuid references public.divisions(id) on delete set null,
  name text not null,
  code text,
  leader_user_id uuid references public.profiles(id),
  status text not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  name text not null,
  code text,
  leader_user_id uuid references public.profiles(id),
  status text not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_entity_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'strategist', 'analyst', 'department_head', 'viewer', 'executive')),
  department_id uuid references public.departments(id) on delete set null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (user_id, entity_id, role, department_id)
);

create table if not exists public.strategic_cycles (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  name text not null,
  cycle_type text not null default 'annual',
  start_date date not null,
  end_date date not null,
  status text not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date <= end_date)
);

create table if not exists public.workspace_registry (
  id uuid primary key default gen_random_uuid(),
  workspace_code text not null unique,
  workspace_name text not null,
  sequence integer not null unique,
  purpose text not null,
  supports_ai boolean not null default true,
  supports_import boolean not null default true,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_status (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  strategic_cycle_id uuid references public.strategic_cycles(id) on delete cascade,
  workspace_code text not null references public.workspace_registry(workspace_code),
  status text not null default 'not_started',
  completion_percent numeric(5,2) not null default 0,
  data_readiness_score numeric(5,2) not null default 0,
  pending_approvals integer not null default 0,
  stale_links integer not null default 0,
  owner_user_id uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id, strategic_cycle_id, workspace_code)
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  workspace_code text references public.workspace_registry(workspace_code),
  record_table text not null,
  record_id uuid not null,
  record_version integer not null default 1,
  request_type text not null default 'manual',
  status text not null default 'pending',
  requested_by uuid references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  reviewer_notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.version_history (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  record_table text not null,
  record_id uuid not null,
  version integer not null,
  snapshot jsonb not null,
  change_summary text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (record_table, record_id, version)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references public.entities(id) on delete set null,
  actor_user_id uuid,
  event_type text not null,
  resource_type text not null,
  resource_id uuid,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references public.entities(id) on delete cascade,
  actor_user_id uuid,
  activity_type text not null,
  workspace_code text,
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  workspace_code text references public.workspace_registry(workspace_code),
  target_table text,
  prompt_template text,
  prompt_version integer not null default 1,
  input_snapshot jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  output_markdown text,
  model text not null default 'manual-router',
  confidence_score numeric(5,2),
  status text not null default 'draft',
  reviewed_by uuid references public.profiles(id),
  approved_record_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_run_sources (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  ai_run_id uuid not null references public.ai_runs(id) on delete cascade,
  source_workspace_code text,
  source_table text not null,
  source_record_id uuid not null,
  source_record_version integer,
  citation_label text,
  citation_summary text,
  relevance_score numeric(5,2),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.source_connectors (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  name text not null,
  connector_type text not null default 'manual_upload',
  config jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  strategic_cycle_id uuid references public.strategic_cycles(id) on delete set null,
  workspace_code text references public.workspace_registry(workspace_code),
  target_table text,
  source_connector_id uuid references public.source_connectors(id),
  status text not null default 'uploaded',
  row_count integer not null default 0,
  valid_row_count integer not null default 0,
  error_row_count integer not null default 0,
  committed_row_count integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  committed_by uuid references public.profiles(id),
  committed_at timestamptz,
  rolled_back_by uuid references public.profiles(id),
  rolled_back_at timestamptz
);

create table if not exists public.import_files (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  original_filename text not null,
  storage_bucket text not null default 'imports',
  storage_key text not null,
  mime_type text,
  file_size_bytes bigint,
  checksum_sha256 text,
  detected_columns jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.import_mappings (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  workspace_code text references public.workspace_registry(workspace_code),
  target_table text not null,
  name text not null,
  source_column_map jsonb not null default '{}'::jsonb,
  transform_rules jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  status text not null default 'draft',
  version integer not null default 1,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.import_rows (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  import_file_id uuid references public.import_files(id) on delete cascade,
  row_number integer not null,
  raw_data jsonb not null,
  mapped_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb not null default '{}'::jsonb,
  row_hash text,
  validation_status text not null default 'pending',
  target_table text,
  target_record_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_batch_id, row_number)
);

create table if not exists public.import_errors (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  import_row_id uuid references public.import_rows(id) on delete cascade,
  severity text not null default 'error',
  field_name text,
  error_code text not null,
  message text not null,
  raw_value text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.import_validation_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_code text references public.workspace_registry(workspace_code),
  target_table text not null,
  field_name text not null,
  rule_type text not null,
  rule_config jsonb not null default '{}'::jsonb,
  severity text not null default 'error',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.import_commit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  action text not null,
  target_table text,
  target_record_ids uuid[] not null default '{}',
  row_count integer not null default 0,
  status text not null default 'started',
  error_message text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_data_links (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  source_workspace_code text,
  source_table text not null,
  source_record_id uuid not null,
  source_record_version integer,
  target_workspace_code text,
  target_table text not null,
  target_record_id uuid not null,
  target_record_version integer,
  link_type text not null,
  link_strength numeric(5,2),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.data_lineage_edges (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  source_type text not null,
  source_table text,
  source_id uuid not null,
  source_version integer,
  target_type text not null,
  target_table text,
  target_id uuid not null,
  target_version integer,
  edge_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create or replace function public.create_sios_business_table(table_name text, extra_columns text default '')
returns void
language plpgsql
as $$
begin
  execute format(
    'create table if not exists public.%I (
      id uuid primary key default gen_random_uuid(),
      entity_id uuid not null references public.entities(id) on delete cascade,
      strategic_cycle_id uuid references public.strategic_cycles(id) on delete set null,
      title text,
      description text,
      data jsonb not null default ''{}''::jsonb,
      source_type text not null default ''manual'',
      import_batch_id uuid references public.import_batches(id) on delete set null,
      ai_run_id uuid references public.ai_runs(id) on delete set null,
      created_by uuid references public.profiles(id),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      status text not null default ''draft'',
      version integer not null default 1
      %s
    )',
    table_name,
    case when coalesce(extra_columns, '') = '' then '' else ', ' || extra_columns end
  );
end;
$$;

select public.create_sios_business_table('ws01_vision_mission', 'vision text, mission text');
select public.create_sios_business_table('ws01_core_values', 'value_name text, value_statement text');
select public.create_sios_business_table('ws01_strategic_intents', 'intent_name text, time_horizon text');
select public.create_sios_business_table('ws01_business_model_canvas', 'canvas_section text');
select public.create_sios_business_table('ws01_value_proposition_canvas', 'customer_job text, pain text, gain text');
select public.create_sios_business_table('ws01_org_units', 'parent_unit_id uuid, leader_user_id uuid references public.profiles(id)');
select public.create_sios_business_table('ws01_products', 'product_code text, product_name text, product_category text, lifecycle_stage text, revenue_model text, is_active boolean not null default true');
select public.create_sios_business_table('ws01_customer_segments', 'segment_name text, segment_type text, revenue_contribution_percent numeric(6,2)');

select public.create_sios_business_table('ws02_pestel_analyses', 'analysis_name text, horizon text');
select public.create_sios_business_table('ws02_pestel_factors', 'factor_type text, impact_score numeric(5,2), probability_score numeric(5,2), opportunity_threat text');
select public.create_sios_business_table('ws02_porter_analyses', 'analysis_name text, industry_scope text');
select public.create_sios_business_table('ws02_competitors', 'competitor_name text, competitor_type text, threat_level text, market_share_estimate numeric(6,2)');
select public.create_sios_business_table('ws02_market_analyses', 'market_name text, market_size numeric, growth_rate numeric(6,2)');
select public.create_sios_business_table('ws02_tam_sam_som', 'market_name text, tam numeric, sam numeric, som numeric, currency char(3)');
select public.create_sios_business_table('ws02_customer_intelligence', 'segment_name text, insight_type text');
select public.create_sios_business_table('ws02_jtbd', 'customer_job text, desired_outcome text');
select public.create_sios_business_table('ws02_trends', 'trend_name text, trend_stage text, impact_score numeric(5,2)');
select public.create_sios_business_table('ws02_scenarios', 'scenario_name text, probability_score numeric(5,2), impact_score numeric(5,2)');

select public.create_sios_business_table('ws03_ife_analyses', 'analysis_name text, total_score numeric(6,3)');
select public.create_sios_business_table('ws03_ife_factors', 'factor_type text, weight numeric(6,4), rating numeric(5,2), weighted_score numeric(6,3)');
select public.create_sios_business_table('ws03_efe_analyses', 'analysis_name text, total_score numeric(6,3)');
select public.create_sios_business_table('ws03_efe_factors', 'factor_type text, weight numeric(6,4), rating numeric(5,2), weighted_score numeric(6,3)');
select public.create_sios_business_table('ws03_vrio_resources', 'resource_name text, value_score numeric(5,2), rarity_score numeric(5,2), imitability_score numeric(5,2), organization_score numeric(5,2), advantage_classification text');
select public.create_sios_business_table('ws03_capabilities', 'capability_name text, maturity_score numeric(5,2), performance_score numeric(5,2)');
select public.create_sios_business_table('ws03_value_chain_activities', 'activity_name text, activity_type text, performance_score numeric(5,2)');
select public.create_sios_business_table('ws03_org_health_assessments', 'assessment_name text, health_score numeric(5,2)');
select public.create_sios_business_table('ws03_digital_maturity_assessments', 'assessment_name text, maturity_score numeric(5,2)');
select public.create_sios_business_table('ws03_financial_health_assessments', 'assessment_name text, health_score numeric(5,2)');

select public.create_sios_business_table('ws04_pl_records', 'period_start date, period_end date, currency char(3), revenue numeric, cogs numeric, gross_margin numeric, opex numeric, ebitda numeric, net_income numeric');
select public.create_sios_business_table('ws04_revenue_records', 'period_start date, period_end date, currency char(3), revenue_stream text, amount numeric');
select public.create_sios_business_table('ws04_cost_records', 'period_start date, period_end date, currency char(3), cost_category text, amount numeric');
select public.create_sios_business_table('ws04_product_profitability', 'product_id uuid, period_start date, period_end date, currency char(3), revenue numeric, direct_cost numeric, allocated_cost numeric, gross_margin numeric, contribution_margin numeric');
select public.create_sios_business_table('ws04_customer_profitability', 'customer_segment_id uuid, period_start date, period_end date, currency char(3), revenue numeric, cost_to_serve numeric, contribution_margin numeric');
select public.create_sios_business_table('ws04_channel_profitability', 'channel_name text, period_start date, period_end date, currency char(3), revenue numeric, cost numeric, margin numeric');
select public.create_sios_business_table('ws04_cash_flow_records', 'period_start date, period_end date, currency char(3), operating_cash_flow numeric, investing_cash_flow numeric, financing_cash_flow numeric, free_cash_flow numeric');
select public.create_sios_business_table('ws04_investment_analyses', 'investment_name text, currency char(3), capex numeric, opex numeric, expected_return numeric, payback_months integer, npv numeric, irr numeric');

select public.create_sios_business_table('ws05_swot_analyses', 'analysis_name text');
select public.create_sios_business_table('ws05_swot_items', 'item_type text, impact_score numeric(5,2), confidence_score numeric(5,2), source_workspace_code text, source_record_id uuid');
select public.create_sios_business_table('ws05_tows_strategies', 'strategy_type text, expected_impact_score numeric(5,2), feasibility_score numeric(5,2)');
select public.create_sios_business_table('ws05_strategic_themes', 'theme_name text, priority_score numeric(5,2)');
select public.create_sios_business_table('ws05_opportunity_rankings', 'opportunity_name text, ranking integer, score numeric(6,2)');
select public.create_sios_business_table('ws05_risk_rankings', 'risk_name text, ranking integer, score numeric(6,2)');

select public.create_sios_business_table('ws06_bcg_items', 'product_id uuid, market_growth_rate numeric(6,2), relative_market_share numeric(8,3), bcg_classification text');
select public.create_sios_business_table('ws06_ansoff_options', 'option_name text, market_type text, product_type text, risk_score numeric(5,2)');
select public.create_sios_business_table('ws06_ge_mckinsey_items', 'business_unit text, industry_attractiveness numeric(5,2), competitive_strength numeric(5,2)');
select public.create_sios_business_table('ws06_blue_ocean_factors', 'factor_name text, current_level numeric(5,2), target_level numeric(5,2)');
select public.create_sios_business_table('ws06_errc_items', 'action_type text, factor_name text');
select public.create_sios_business_table('ws06_product_lifecycle_items', 'product_id uuid, lifecycle_stage text, revenue_trend text, margin_trend text');

select public.create_sios_business_table('ws07_decision_runs', 'run_name text, decision_type text, total_score numeric(6,2)');
select public.create_sios_business_table('ws07_opportunity_scores', 'opportunity_name text, strategic_fit_score numeric(5,2), financial_impact_score numeric(5,2), feasibility_score numeric(5,2), total_score numeric(6,2)');
select public.create_sios_business_table('ws07_risk_scores', 'risk_name text, probability_score numeric(5,2), impact_score numeric(5,2), risk_score numeric(6,2), mitigation text');
select public.create_sios_business_table('ws07_strategic_priorities', 'priority_name text, priority_rank integer, score numeric(6,2), owner_user_id uuid references public.profiles(id)');
select public.create_sios_business_table('ws07_scoring_weights', 'criterion_name text, weight numeric(6,4)');

select public.create_sios_business_table('ws08_bsc_cycles', 'cycle_name text');
select public.create_sios_business_table('ws08_bsc_objectives', 'perspective text, objective_name text, linked_priority_id uuid, owner_user_id uuid references public.profiles(id), target_outcome text');
select public.create_sios_business_table('ws08_strategy_map_edges', 'source_objective_id uuid, target_objective_id uuid, link_type text, strength_score numeric(5,2)');

select public.create_sios_business_table('ws09_okrs', 'objective_id uuid, okr_title text, owner_user_id uuid references public.profiles(id), period_start date, period_end date, progress_percent numeric(5,2)');
select public.create_sios_business_table('ws09_key_results', 'okr_id uuid, key_result_name text, baseline_value numeric, target_value numeric, current_value numeric, unit text');
select public.create_sios_business_table('ws09_initiatives', 'initiative_name text, linked_objective_id uuid, owner_user_id uuid references public.profiles(id), budget numeric, currency char(3), progress_percent numeric(5,2)');
select public.create_sios_business_table('ws09_projects', 'initiative_id uuid, project_name text, project_manager_id uuid references public.profiles(id), budget numeric, progress_percent numeric(5,2), health_status text');
select public.create_sios_business_table('ws09_tasks', 'project_id uuid, task_name text, assignee_user_id uuid references public.profiles(id), due_date date, completed_at timestamptz');
select public.create_sios_business_table('ws09_raci_assignments', 'initiative_id uuid, user_id uuid references public.profiles(id), raci_role text');
select public.create_sios_business_table('ws09_risk_register', 'risk_name text, probability_score numeric(5,2), impact_score numeric(5,2), mitigation text, owner_user_id uuid references public.profiles(id)');

select public.create_sios_business_table('ws10_kpis', 'kpi_name text, formula text, unit text, frequency text, owner_user_id uuid references public.profiles(id), target_direction text, linked_objective_id uuid');
select public.create_sios_business_table('ws10_kpi_readings', 'kpi_id uuid, period_start date, period_end date, target_value numeric, actual_value numeric, variance_value numeric, variance_percent numeric');
select public.create_sios_business_table('ws10_dashboards', 'dashboard_name text, layout_json jsonb not null default ''{}''::jsonb');
select public.create_sios_business_table('ws10_review_cycles', 'review_name text, review_type text, review_date date, summary text, participants jsonb not null default ''[]''::jsonb');
select public.create_sios_business_table('ws10_review_notes', 'review_cycle_id uuid, note_type text, decision_text text, owner_user_id uuid references public.profiles(id), due_date date');

select public.create_sios_business_table('ws11_roles', 'role_name text, org_unit_id uuid, accountabilities text, capacity_fte numeric(8,2), criticality_score numeric(5,2)');
select public.create_sios_business_table('ws11_competencies', 'competency_name text, competency_domain text, required_level text');
select public.create_sios_business_table('ws11_org_design_scenarios', 'scenario_name text, operating_model text, expected_impact text');
select public.create_sios_business_table('ws11_succession_plans', 'role_id uuid, successor_user_id uuid references public.profiles(id), readiness_level text');

select public.create_sios_business_table('ws12_memory_entries', 'memory_type text, source_workspace_code text, source_record_id uuid, summary text, tags text[] not null default ''{}''');
select public.create_sios_business_table('ws12_decision_records', 'decision_title text, decision_date date, decision_owner_id uuid references public.profiles(id), rationale text, outcome_status text');
select public.create_sios_business_table('ws12_lessons_learned', 'lesson_title text, context_summary text, applicability text, confidence_score numeric(5,2)');
select public.create_sios_business_table('ws12_playbooks', 'playbook_name text, playbook_type text, steps jsonb not null default ''[]''::jsonb');

create table if not exists public.ws12_memory_embeddings (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  memory_entry_id uuid references public.ws12_memory_entries(id) on delete cascade,
  content text not null,
  embedding_model text not null default 'text-embedding',
  embedding extensions.vector(1536),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'approved',
  version integer not null default 1
);

create or replace function public.current_profile_id()
returns uuid
language sql
stable
as $$
  select p.id
  from public.profiles p
  where p.id = auth.uid()
     or p.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.user_can_access_entity(target_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_entity_roles uer
    where uer.entity_id = target_entity_id
      and uer.user_id = public.current_profile_id()
  )
$$;

create or replace function public.user_has_entity_role(target_entity_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_entity_roles uer
    where uer.entity_id = target_entity_id
      and uer.user_id = public.current_profile_id()
      and uer.role = any(allowed_roles)
  )
$$;

create or replace function public.user_can_mutate_entity(target_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_has_entity_role(
    target_entity_id,
    array['owner', 'admin', 'strategist', 'analyst', 'department_head']
  )
$$;

create or replace function public.audit_entity_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_entity_id uuid;
begin
  target_entity_id := coalesce(new.entity_id, old.entity_id);

  insert into public.audit_logs (
    entity_id,
    actor_user_id,
    event_type,
    resource_type,
    resource_id,
    before_state,
    after_state,
    metadata
  )
  values (
    target_entity_id,
    public.current_profile_id(),
    lower(tg_table_name || '.' || tg_op),
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    jsonb_build_object('schema', tg_table_schema)
  );

  return coalesce(new, old);
end;
$$;

insert into public.workspace_registry (workspace_code, workspace_name, sequence, purpose, supports_ai, supports_import)
values
  ('WS01', 'Business Foundation', 1, 'Define vision, mission, business model, products, customers, and entity context.', true, true),
  ('WS02', 'External Intelligence', 2, 'Capture market, PESTEL, Porter, competitors, trends, and scenarios.', true, true),
  ('WS03', 'Internal Intelligence', 3, 'Assess internal capabilities, resources, VRIO, IFE/EFE, maturity, and health.', true, true),
  ('WS04', 'Financial Intelligence', 4, 'Capture P&L, revenue, cost, profitability, cash flow, and investments.', true, true),
  ('WS05', 'Strategic Synthesis', 5, 'Synthesize SWOT, TOWS, themes, opportunities, and risks.', true, true),
  ('WS06', 'Portfolio & Growth', 6, 'Analyze BCG, Ansoff, GE McKinsey, Blue Ocean, ERRC, and lifecycle.', true, true),
  ('WS07', 'AI Strategic Decision Engine', 7, 'Score opportunities, risks, priorities, and strategic decision runs.', true, true),
  ('WS08', 'Strategy Mapping', 8, 'Translate priorities into BSC objectives and strategy map edges.', true, true),
  ('WS09', 'Execution Management', 9, 'Manage OKRs, initiatives, projects, tasks, RACI, and risks.', true, true),
  ('WS10', 'Performance Management', 10, 'Track KPIs, dashboards, reviews, and performance notes.', true, true),
  ('WS11', 'Organization Design', 11, 'Manage roles, competencies, org design scenarios, and succession plans.', true, true),
  ('WS12', 'Strategic Memory', 12, 'Capture memory entries, decisions, lessons, playbooks, and embeddings.', true, true)
on conflict (workspace_code) do update set
  workspace_name = excluded.workspace_name,
  sequence = excluded.sequence,
  purpose = excluded.purpose,
  supports_ai = excluded.supports_ai,
  supports_import = excluded.supports_import;

insert into storage.buckets (id, name, public)
values ('imports', 'imports', false)
on conflict (id) do nothing;

do $$
declare
  tbl text;
begin
  for tbl in
    select table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'updated_at'
  loop
    if not exists (
      select 1
      from pg_trigger
      where tgname = tbl || '_set_updated_at'
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
        tbl || '_set_updated_at',
        tbl
      );
    end if;
  end loop;
end $$;

do $$
declare
  tbl text;
begin
  for tbl in
    select distinct table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'entity_id'
      and table_name not in ('audit_logs', 'activity_logs')
  loop
    execute format('alter table public.%I enable row level security', tbl);

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = tbl and policyname = 'entity_select') then
      execute format('create policy entity_select on public.%I for select using (public.user_can_access_entity(entity_id))', tbl);
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = tbl and policyname = 'entity_insert') then
      execute format('create policy entity_insert on public.%I for insert with check (public.user_can_mutate_entity(entity_id))', tbl);
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = tbl and policyname = 'entity_update') then
      execute format('create policy entity_update on public.%I for update using (public.user_can_mutate_entity(entity_id)) with check (public.user_can_mutate_entity(entity_id))', tbl);
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = tbl and policyname = 'entity_delete') then
      execute format('create policy entity_delete on public.%I for delete using (public.user_has_entity_role(entity_id, array[''owner'', ''admin'']))', tbl);
    end if;

    if tbl like 'ws%' or tbl in ('import_batches', 'import_files', 'import_mappings', 'import_rows', 'import_errors', 'import_commit_logs', 'workspace_data_links', 'data_lineage_edges', 'ai_runs', 'ai_run_sources', 'approval_requests', 'version_history') then
      if not exists (select 1 from pg_trigger where tgname = tbl || '_audit_mutation') then
        execute format(
          'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_entity_mutation()',
          tbl || '_audit_mutation',
          tbl
        );
      end if;
    end if;
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.entities enable row level security;
alter table public.user_entity_roles enable row level security;
alter table public.workspace_registry enable row level security;
alter table public.import_validation_rules enable row level security;
alter table public.audit_logs enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
for select using (id = public.current_profile_id() or auth_user_id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
for update using (id = public.current_profile_id() or auth_user_id = auth.uid())
with check (id = public.current_profile_id() or auth_user_id = auth.uid());

drop policy if exists entities_role_select on public.entities;
create policy entities_role_select on public.entities
for select using (public.user_can_access_entity(id));

drop policy if exists groups_role_select on public.groups;
create policy groups_role_select on public.groups
for select using (
  exists (
    select 1
    from public.entities e
    where e.group_id = groups.id
      and public.user_can_access_entity(e.id)
  )
);

drop policy if exists user_entity_roles_self_select on public.user_entity_roles;
create policy user_entity_roles_self_select on public.user_entity_roles
for select using (user_id = public.current_profile_id() or public.user_has_entity_role(entity_id, array['owner', 'admin']));

drop policy if exists workspace_registry_read_authenticated on public.workspace_registry;
create policy workspace_registry_read_authenticated on public.workspace_registry
for select using (auth.role() = 'authenticated');

drop policy if exists import_validation_rules_read_authenticated on public.import_validation_rules;
create policy import_validation_rules_read_authenticated on public.import_validation_rules
for select using (auth.role() = 'authenticated');

drop policy if exists audit_logs_entity_select on public.audit_logs;
create policy audit_logs_entity_select on public.audit_logs
for select using (
  entity_id is not null
  and public.user_has_entity_role(entity_id, array['owner', 'admin', 'strategist', 'executive'])
);

drop policy if exists activity_logs_entity_select on public.activity_logs;
create policy activity_logs_entity_select on public.activity_logs
for select using (
  entity_id is not null
  and public.user_can_access_entity(entity_id)
);

create index if not exists idx_profiles_auth_user_id on public.profiles(auth_user_id);
create index if not exists idx_entities_group_id on public.entities(group_id);
create index if not exists idx_user_entity_roles_user_entity on public.user_entity_roles(user_id, entity_id);
create index if not exists idx_workspace_status_entity_cycle on public.workspace_status(entity_id, strategic_cycle_id);
create index if not exists idx_import_batches_entity_status on public.import_batches(entity_id, status);
create index if not exists idx_import_rows_batch_status on public.import_rows(import_batch_id, validation_status);
create index if not exists idx_import_errors_batch_severity on public.import_errors(import_batch_id, severity);
create index if not exists idx_workspace_links_source on public.workspace_data_links(entity_id, source_table, source_record_id);
create index if not exists idx_workspace_links_target on public.workspace_data_links(entity_id, target_table, target_record_id);
create index if not exists idx_lineage_source on public.data_lineage_edges(entity_id, source_type, source_id);
create index if not exists idx_lineage_target on public.data_lineage_edges(entity_id, target_type, target_id);
create index if not exists idx_ai_runs_entity_workspace on public.ai_runs(entity_id, workspace_code, status);
create index if not exists idx_approval_requests_entity_status on public.approval_requests(entity_id, status, assigned_to);
create index if not exists idx_audit_logs_entity_created on public.audit_logs(entity_id, created_at desc);

do $$
declare
  tbl text;
begin
  for tbl in
    select distinct table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'entity_id'
      and table_name like 'ws%'
  loop
    execute format('create index if not exists %I on public.%I(entity_id, status)', 'idx_' || tbl || '_entity_status', tbl);
    execute format('create index if not exists %I on public.%I(entity_id, strategic_cycle_id)', 'idx_' || tbl || '_entity_cycle', tbl);
    execute format('create index if not exists %I on public.%I(entity_id, updated_at desc)', 'idx_' || tbl || '_entity_updated', tbl);
  end loop;
end $$;

create index if not exists idx_ws12_memory_embeddings_entity on public.ws12_memory_embeddings(entity_id);
create index if not exists idx_ws12_memory_embeddings_vector
  on public.ws12_memory_embeddings using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100)
  where embedding is not null;

alter function public.set_updated_at() set search_path = public;
alter function public.create_sios_business_table(text, text) set search_path = public;
alter function public.current_profile_id() set search_path = public;
revoke execute on function public.audit_entity_mutation() from public, anon, authenticated;
revoke execute on function public.create_sios_business_table(text, text) from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
