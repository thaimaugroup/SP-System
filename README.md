# SIOS — Strategic Intelligence Operating System

An AI-native, multi-entity strategic operating system built on Next.js 14 (App Router),
TypeScript, Tailwind CSS, and Supabase (PostgreSQL + Auth + Realtime + RLS).

SIOS connects 12 strategy workspaces (WS01–WS12) through a shared, versioned, reviewable
strategic data graph. Every business record is scoped by `entity_id` and protected by
PostgreSQL Row-Level Security.

## Tech stack

- **Next.js 14** App Router (server components + route handlers)
- **TypeScript**, **Tailwind CSS**
- **Supabase**: Postgres, Auth, Realtime (live push), Storage, RLS
- **Recharts** (dashboards), **Lucide** (icons)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
#   then fill in your Supabase URL, anon key, and service role key

# 3. Run the dev server
npm run dev          # http://localhost:3000

# 4. Production build
npm run build && npm run start
```

## Environment variables

See [.env.example](.env.example). Required:

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Browser-safe anon key (RLS-protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Admin ops: create entity, invite user |
| `NEXT_PUBLIC_APP_URL` | client + server | Base URL for invite redirects |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next.js) |
| `npm run qa:realtime` | End-to-end realtime QA (requires `QA_*` env vars) |
| `npm run qa:supabase` | Persistence QA against real Supabase |

## Deploying to Vercel

1. Import the GitHub repo into Vercel.
2. Add the four environment variables above (Production + Preview).
3. Deploy. For lowest DB latency, choose a region near your Supabase project.

## Database

Schema and RLS policies are versioned under [`supabase/migrations`](supabase/migrations).
Apply them with the Supabase CLI (`supabase db push`) or the dashboard SQL editor.
