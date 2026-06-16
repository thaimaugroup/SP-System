-- PRD §11.2: AI output must log latency and token usage per run.
-- These columns were missing from the initial schema; added live via MCP
-- and now tracked here for migration idempotency.
alter table public.ai_runs
  add column if not exists latency_ms   integer,
  add column if not exists token_usage  jsonb default '{}'::jsonb;

comment on column public.ai_runs.latency_ms   is 'Wall-clock milliseconds from prompt render to output receipt (PRD §11.2).';
comment on column public.ai_runs.token_usage  is 'JSON: {input_tokens, output_tokens, total_tokens} from the LLM provider (PRD §11.2).';
