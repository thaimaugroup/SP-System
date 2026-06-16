-- SIOS demo seed data
-- Demo group: Antigravity Group
-- Demo entity: Demo F&B Company

with demo as (
  select
    '00000000-0000-0000-0000-000000000001'::uuid as owner_id,
    '00000000-0000-0000-0000-000000000002'::uuid as strategist_id,
    '00000000-0000-0000-0000-000000000003'::uuid as analyst_id,
    '10000000-0000-0000-0000-000000000001'::uuid as group_id,
    '20000000-0000-0000-0000-000000000001'::uuid as entity_id,
    '30000000-0000-0000-0000-000000000001'::uuid as cycle_id
)
insert into public.profiles (id, email, full_name, title, status)
select owner_id, 'owner@sios.demo', 'Maya Tran', 'Group Strategy Owner', 'active' from demo
union all select strategist_id, 'strategist@sios.demo', 'Daniel Lee', 'Chief Strategy Officer', 'active' from demo
union all select analyst_id, 'analyst@sios.demo', 'Nina Patel', 'Strategic Intelligence Analyst', 'active' from demo
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  title = excluded.title,
  status = excluded.status;

with demo as (
  select
    '00000000-0000-0000-0000-000000000001'::uuid as owner_id,
    '10000000-0000-0000-0000-000000000001'::uuid as group_id,
    '20000000-0000-0000-0000-000000000001'::uuid as entity_id,
    '30000000-0000-0000-0000-000000000001'::uuid as cycle_id
)
insert into public.groups (id, name, slug, base_currency, fiscal_year_start_month, status, created_by)
select group_id, 'Antigravity Group', 'antigravity-group', 'USD', 1, 'active', owner_id from demo
on conflict (id) do update set name = excluded.name, slug = excluded.slug;

with demo as (
  select
    '00000000-0000-0000-0000-000000000001'::uuid as owner_id,
    '10000000-0000-0000-0000-000000000001'::uuid as group_id,
    '20000000-0000-0000-0000-000000000001'::uuid as entity_id
)
insert into public.entities (id, group_id, name, code, entity_type, industry, geography, base_currency, status, created_by)
select entity_id, group_id, 'Demo F&B Company', 'DEMO-FB', 'business_unit', 'Food & Beverage', 'Thailand', 'USD', 'active', owner_id from demo
on conflict (id) do update set
  name = excluded.name,
  code = excluded.code,
  industry = excluded.industry,
  geography = excluded.geography;

update public.profiles
set default_entity_id = '20000000-0000-0000-0000-000000000001'::uuid
where id in (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000003'::uuid
);

insert into public.user_entity_roles (user_id, entity_id, role, created_by)
values
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'owner', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'strategist', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'analyst', '00000000-0000-0000-0000-000000000001')
on conflict do nothing;

insert into public.strategic_cycles (id, entity_id, name, cycle_type, start_date, end_date, status, created_by)
values (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'FY2026 Strategic Cycle',
  'annual',
  '2026-01-01',
  '2026-12-31',
  'active',
  '00000000-0000-0000-0000-000000000001'
)
on conflict (id) do update set name = excluded.name, status = excluded.status;

insert into public.workspace_status (entity_id, strategic_cycle_id, workspace_code, status, completion_percent, data_readiness_score, pending_approvals, stale_links, created_by)
select
  '20000000-0000-0000-0000-000000000001'::uuid,
  '30000000-0000-0000-0000-000000000001'::uuid,
  workspace_code,
  case
    when workspace_code in ('WS01', 'WS04') then 'approved'
    when workspace_code in ('WS02', 'WS03', 'WS05', 'WS07', 'WS09', 'WS10', 'WS12') then 'in_progress'
    else 'not_started'
  end,
  case
    when workspace_code in ('WS01', 'WS04') then 100
    when workspace_code in ('WS02', 'WS03', 'WS05', 'WS07', 'WS09', 'WS10', 'WS12') then 55
    else 10
  end,
  case
    when workspace_code in ('WS01', 'WS04') then 92
    else 62
  end,
  case when workspace_code in ('WS05', 'WS07') then 2 else 0 end,
  0,
  '00000000-0000-0000-0000-000000000001'::uuid
from public.workspace_registry
on conflict (entity_id, strategic_cycle_id, workspace_code) do update set
  status = excluded.status,
  completion_percent = excluded.completion_percent,
  data_readiness_score = excluded.data_readiness_score,
  pending_approvals = excluded.pending_approvals;

insert into public.ws01_vision_mission (entity_id, strategic_cycle_id, title, vision, mission, description, status, version, created_by)
values (
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'North Star',
  'Become the most trusted premium casual F&B platform in Southeast Asia.',
  'Serve consistent, profitable, locally relevant food experiences through disciplined operations and brand-led growth.',
  'Approved foundation statement for Demo F&B Company.',
  'approved',
  1,
  '00000000-0000-0000-0000-000000000001'
);

insert into public.ws01_core_values (entity_id, strategic_cycle_id, title, value_name, value_statement, status, version, created_by)
values
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Customer obsession', 'Customer obsession', 'Every menu, store, and service decision starts with the guest.', 'approved', 1, '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Operational discipline', 'Operational discipline', 'We scale only what can be run predictably and profitably.', 'approved', 1, '00000000-0000-0000-0000-000000000001');

insert into public.ws01_products (id, entity_id, strategic_cycle_id, title, product_code, product_name, product_category, lifecycle_stage, revenue_model, status, version, created_by)
values
  ('41000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Signature rice bowl', 'BOWL-001', 'Signature Rice Bowl', 'Core menu', 'growth', 'direct_sale', 'approved', 1, '00000000-0000-0000-0000-000000000001'),
  ('41000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Ready-to-drink tea', 'DRINK-001', 'Ready-to-Drink Tea', 'Beverage', 'introduction', 'direct_sale', 'approved', 1, '00000000-0000-0000-0000-000000000001'),
  ('41000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Catering set', 'CAT-001', 'Corporate Catering Set', 'Catering', 'growth', 'contract', 'approved', 1, '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.ws01_customer_segments (id, entity_id, strategic_cycle_id, title, segment_name, segment_type, revenue_contribution_percent, status, version, created_by)
values
  ('42000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Urban office workers', 'Urban Office Workers', 'B2C', 48, 'approved', 1, '00000000-0000-0000-0000-000000000001'),
  ('42000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Corporate catering buyers', 'Corporate Catering Buyers', 'B2B', 22, 'approved', 1, '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.ws04_pl_records (entity_id, strategic_cycle_id, title, period_start, period_end, currency, revenue, cogs, gross_margin, opex, ebitda, net_income, status, version, created_by)
select
  '20000000-0000-0000-0000-000000000001'::uuid,
  '30000000-0000-0000-0000-000000000001'::uuid,
  to_char(d, 'Mon YYYY') || ' P&L',
  d::date,
  (d + interval '1 month - 1 day')::date,
  'USD',
  120000 + (extract(month from d)::int * 7000),
  52000 + (extract(month from d)::int * 2500),
  68000 + (extract(month from d)::int * 4500),
  39000 + (extract(month from d)::int * 1500),
  29000 + (extract(month from d)::int * 3000),
  19000 + (extract(month from d)::int * 2100),
  'approved',
  1,
  '00000000-0000-0000-0000-000000000001'::uuid
from generate_series('2026-01-01'::date, '2026-12-01'::date, '1 month'::interval) d;

insert into public.ws04_product_profitability (entity_id, strategic_cycle_id, title, product_id, period_start, period_end, currency, revenue, direct_cost, allocated_cost, gross_margin, contribution_margin, status, version, created_by)
values
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Signature Rice Bowl profitability', '41000000-0000-0000-0000-000000000001', '2026-01-01', '2026-12-31', 'USD', 960000, 410000, 120000, 550000, 430000, 'approved', 1, '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Ready-to-Drink Tea profitability', '41000000-0000-0000-0000-000000000002', '2026-01-01', '2026-12-31', 'USD', 240000, 110000, 42000, 130000, 88000, 'approved', 1, '00000000-0000-0000-0000-000000000001');

insert into public.ws02_pestel_factors (entity_id, strategic_cycle_id, title, factor_type, impact_score, probability_score, opportunity_threat, description, status, version, created_by)
values
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Higher urban food delivery adoption', 'social', 8.5, 7.5, 'opportunity', 'Urban consumers increasingly expect reliable delivery and quick lunch options.', 'approved', 1, '00000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Ingredient cost volatility', 'economic', 8.0, 8.0, 'threat', 'Imported ingredients and protein costs remain volatile and can compress gross margin.', 'approved', 1, '00000000-0000-0000-0000-000000000003');

insert into public.ws03_ife_factors (entity_id, strategic_cycle_id, title, factor_type, weight, rating, weighted_score, description, status, version, created_by)
values
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Store operations discipline', 'strength', 0.18, 4.0, 0.72, 'Strong SOP adherence and store-level execution consistency.', 'approved', 1, '00000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Digital CRM maturity gap', 'weakness', 0.14, 2.0, 0.28, 'Customer data is fragmented and limits personalization.', 'approved', 1, '00000000-0000-0000-0000-000000000003');

insert into public.ws03_vrio_resources (entity_id, strategic_cycle_id, title, resource_name, value_score, rarity_score, imitability_score, organization_score, advantage_classification, description, status, version, created_by)
values
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Store playbook VRIO', 'Standardized store operating playbook', 4.5, 3.8, 3.6, 4.2, 'temporary_advantage', 'Repeatable operating model supports efficient outlet expansion.', 'approved', 1, '00000000-0000-0000-0000-000000000003');

insert into public.ws05_swot_analyses (id, entity_id, strategic_cycle_id, title, analysis_name, description, status, version, created_by)
values ('51000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'FY2026 SWOT', 'FY2026 Strategic SWOT', 'SWOT synthesized from PESTEL, IFE, VRIO, and finance data.', 'approved', 1, '00000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

insert into public.ws05_swot_items (entity_id, strategic_cycle_id, title, item_type, impact_score, confidence_score, source_workspace_code, description, status, version, created_by)
values
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Operational discipline supports expansion', 'strength', 8.2, 82, 'WS03', 'Store operating playbook and SOP discipline support repeatable growth.', 'approved', 1, '00000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Delivery growth opportunity', 'opportunity', 8.7, 78, 'WS02', 'Urban delivery adoption can expand lunch occasion share.', 'approved', 1, '00000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Ingredient cost pressure', 'threat', 8.0, 80, 'WS02', 'Input volatility may compress gross margin.', 'approved', 1, '00000000-0000-0000-0000-000000000002');

insert into public.ws07_decision_runs (id, entity_id, strategic_cycle_id, title, run_name, decision_type, total_score, description, status, version, created_by)
values ('71000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Delivery growth prioritization', 'Delivery Growth Decision Run', 'growth_priority', 82.4, 'Decision run comparing delivery expansion, catering, and new beverage line.', 'approved', 1, '00000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

insert into public.ws07_strategic_priorities (id, entity_id, strategic_cycle_id, title, priority_name, priority_rank, score, owner_user_id, description, status, version, created_by)
values ('72000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Scale delivery channel profitably', 'Scale delivery channel profitably', 1, 86.2, '00000000-0000-0000-0000-000000000002', 'Prioritize delivery growth while protecting product margin.', 'approved', 1, '00000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

insert into public.ws08_bsc_objectives (id, entity_id, strategic_cycle_id, title, perspective, objective_name, linked_priority_id, owner_user_id, target_outcome, status, version, created_by)
values ('81000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Delivery margin objective', 'financial', 'Improve delivery contribution margin', '72000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Reach 18 percent contribution margin on delivery orders.', 'approved', 1, '00000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

insert into public.ws09_okrs (id, entity_id, strategic_cycle_id, title, objective_id, okr_title, owner_user_id, period_start, period_end, progress_percent, status, version, created_by)
values ('91000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Delivery OKR', '81000000-0000-0000-0000-000000000001', 'Launch profitable delivery growth program', '00000000-0000-0000-0000-000000000002', '2026-01-01', '2026-06-30', 42, 'in_progress', 1, '00000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

insert into public.ws09_key_results (entity_id, strategic_cycle_id, title, okr_id, key_result_name, baseline_value, target_value, current_value, unit, status, version, created_by)
values
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Delivery contribution margin KR', '91000000-0000-0000-0000-000000000001', 'Reach 18 percent delivery contribution margin', 11, 18, 14.2, '%', 'in_progress', 1, '00000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Delivery order mix KR', '91000000-0000-0000-0000-000000000001', 'Grow delivery to 22 percent of order mix', 14, 22, 17, '%', 'in_progress', 1, '00000000-0000-0000-0000-000000000002');

insert into public.ws10_kpis (id, entity_id, strategic_cycle_id, title, kpi_name, formula, unit, frequency, owner_user_id, target_direction, linked_objective_id, status, version, created_by)
values ('10100000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Delivery contribution margin KPI', 'Delivery contribution margin', '(delivery revenue - delivery direct cost) / delivery revenue', '%', 'monthly', '00000000-0000-0000-0000-000000000002', 'increase', '81000000-0000-0000-0000-000000000001', 'approved', 1, '00000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

insert into public.ws10_kpi_readings (entity_id, strategic_cycle_id, title, kpi_id, period_start, period_end, target_value, actual_value, variance_value, variance_percent, status, version, created_by)
values
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Jan delivery margin', '10100000-0000-0000-0000-000000000001', '2026-01-01', '2026-01-31', 15, 13.8, -1.2, -8.0, 'approved', 1, '00000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Feb delivery margin', '10100000-0000-0000-0000-000000000001', '2026-02-01', '2026-02-28', 15.5, 14.2, -1.3, -8.4, 'approved', 1, '00000000-0000-0000-0000-000000000002');

insert into public.ws12_memory_entries (id, entity_id, strategic_cycle_id, title, memory_type, source_workspace_code, source_record_id, summary, description, tags, status, version, created_by)
values ('12100000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Delivery growth decision context', 'decision', 'WS07', '71000000-0000-0000-0000-000000000001', 'Leadership prioritized profitable delivery expansion over rapid outlet growth.', 'Decision was driven by higher delivery adoption, existing store capacity, and need to protect capital efficiency.', array['delivery','growth','margin'], 'approved', 1, '00000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

insert into public.ws12_lessons_learned (entity_id, strategic_cycle_id, title, lesson_title, context_summary, applicability, confidence_score, description, status, version, created_by)
values ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Menu discipline protects margin', 'Menu discipline protects margin', 'Prior campaigns with broad discounting lifted orders but hurt contribution margin.', 'Apply to delivery promotions and new product launches.', 84, 'Discount strategy must be tied to product-level margin guardrails.', 'approved', 1, '00000000-0000-0000-0000-000000000002');

insert into public.ai_runs (id, entity_id, workspace_code, target_table, prompt_template, prompt_version, input_snapshot, output_json, output_markdown, model, confidence_score, status, reviewed_by, approved_record_id, created_by)
values (
  'a1000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'WS05',
  'ws05_swot_items',
  'Generate SWOT from approved PESTEL, IFE, VRIO, and financial records.',
  1,
  '{"sources":["ws02_pestel_factors","ws03_ife_factors","ws04_pl_records"]}'::jsonb,
  '{"summary":"Delivery growth opportunity and margin protection are the dominant strategic synthesis points."}'::jsonb,
  'AI-generated SWOT synthesis reviewed and approved by strategist.',
  'demo-llm-router',
  81,
  'approved',
  '00000000-0000-0000-0000-000000000002',
  '51000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
)
on conflict (id) do nothing;

insert into public.workspace_data_links (entity_id, source_workspace_code, source_table, source_record_id, source_record_version, target_workspace_code, target_table, target_record_id, target_record_version, link_type, link_strength, created_by)
values
  ('20000000-0000-0000-0000-000000000001', 'WS01', 'ws01_products', '41000000-0000-0000-0000-000000000001', 1, 'WS04', 'ws04_product_profitability', (select id from public.ws04_product_profitability where product_id = '41000000-0000-0000-0000-000000000001' limit 1), 1, 'product_financial_input', 1, '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000001', 'WS07', 'ws07_strategic_priorities', '72000000-0000-0000-0000-000000000001', 1, 'WS08', 'ws08_bsc_objectives', '81000000-0000-0000-0000-000000000001', 1, 'priority_to_objective_input', 1, '00000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000001', 'WS08', 'ws08_bsc_objectives', '81000000-0000-0000-0000-000000000001', 1, 'WS09', 'ws09_okrs', '91000000-0000-0000-0000-000000000001', 1, 'objective_to_okr_input', 1, '00000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000001', 'WS10', 'ws10_kpis', '10100000-0000-0000-0000-000000000001', 1, 'WS12', 'ws12_memory_entries', '12100000-0000-0000-0000-000000000001', 1, 'memory_source', 0.8, '00000000-0000-0000-0000-000000000002');

insert into public.data_lineage_edges (entity_id, source_type, source_table, source_id, source_version, target_type, target_table, target_id, target_version, edge_type, metadata, created_by)
select entity_id, 'workspace_record', source_table, source_record_id, source_record_version, 'workspace_record', target_table, target_record_id, target_record_version, 'linked_to', jsonb_build_object('link_type', link_type), created_by
from public.workspace_data_links
where entity_id = '20000000-0000-0000-0000-000000000001';

