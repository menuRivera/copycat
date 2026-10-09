# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project

Copycat: an automated product optimization and competitive intelligence system. It monitors analytics and competitor sites, turns the deltas into "diffs" (proposed changes), a human approves them in a UI, and coding agents implement them.

Planned layout (pnpm workspaces):

- `apps/web` — Next.js + Tailwind approval UI
- `apps/worker` — Temporal worker (cron schedules + workflows)
- `packages/core` — shared clients, prompts, types, capture/diff logic

Key docs:

- `README.md` — what the product is
- `STACK.md` — tech stack decisions
- `SCHEMAS.md` — database schema
- `flows/` — mermaid flowcharts: snapshots, analytics, SDLC, user approval

If behavior changes, notify user and ask if it's ok to update SCHEMAS.md and matching flow diagram.

## Hard rules

1. Never read `.env`, `.env.local`, or any real secrets file. Use `.env.example` for variable names only. If a value is needed, ask the user.
2. Never commit, amend, push, or force-push unless the user explicitly asks.
3. Never modify git config, never skip or bypass hooks.
4. Never print, log, or commit secrets. Service role keys stay server-side; never expose them through `NEXT_PUBLIC_` variables.
5. Do not run destructive commands (`supabase db reset`, `rm -rf`, dropping tables, etc.) without explicit confirmation. Resetting the local Supabase DB wipes local data.
6. Do not add dependencies without checking they fit `STACK.md`. Ask before installing anything globally.
7. Do not create documentation files or prose unless asked. Code comments only when they add real value.
8. When requirements are ambiguous, ask instead of guessing.

## Good practices

- TypeScript strict; avoid `any` unless justified.
- Next.js 16 is installed and differs from older training data. Before writing Next.js code, read the relevant guide under `node_modules/next/dist/docs/` (apps/web).
- Validate external input at boundaries with zod: env vars, LLM outputs, API payloads.
- LLM/VLM structured outputs go through vercel/ai `generateObject` with zod schemas. Detectors use TypeSafe Jev Noul questions (typed yes/no answers); never parse text from models.
- One focused question per Noul call; the caller handles iteration and parallelism.
- Keep pure logic (hashing, deltas, transforms) in `packages/core` so it is testable without network.
- Temporal: workflow code must be deterministic. Side effects (DB, network, browser, LLM calls) only inside activities, and activities should be idempotent where possible.
- Supabase access: the worker uses the service role; the web app uses the user session plus RLS. Never bypass RLS from the browser side.
- Playwright: prefer stable selectors, wait for network idle, capture a screenshot on failure for debugging.
- Structured logging, no secrets, always include `diff_id` / `project_id` for traceability.
- Update `.env.example` whenever a new variable is introduced.
- Keep `flows/*.md` mermaid blocks valid. Validate after edits with `npx -y @mermaid-js/mermaid-cli` (extract the block to a `.mmd` file first).

## Commands (once scaffolded)

- install: `pnpm install`
- web dev: `pnpm --filter web dev`
- worker dev: `pnpm --filter worker dev`
- env: both apps read the repo-root `.env`. Web injects it via `apps/web/scripts/next-with-env.mjs` because `pnpm run` mangles `node --env-file*` flags. Never commit or read `.env`.
- lint: `pnpm lint`
- typecheck: `pnpm typecheck`
- test: `pnpm test`
- before finishing any task: `pnpm lint && pnpm typecheck && pnpm test`

## Supabase (local dev)

Lifecycle:

- `supabase start` — boot the local stack via docker
- `supabase status` — show local URL and anon/service keys
- `supabase stop` — stop containers

Migrations:

- create: `supabase migration new <name>`, then edit the generated SQL in `supabase/migrations/`
- apply locally: `supabase db reset` (recreates the DB, runs all migrations and `supabase/seed.sql`). Local data only, but still destructive.
- never edit an applied migration; always add a new one
- generate TS types: `supabase gen types typescript --local > packages/core/src/db/types.ts`

Storage:

- bucket `screenshots` is public-read; uploads happen from the worker using the service role.

Seed:

- `supabase/seed.sql` is intentionally empty. Projects and competitors are created through the web app.

## Git

- Conventional commits matching the history: `docs:`, `feat:`, `fix:`, `chore:`, `refactor:`.
- Stage only files relevant to the change.
- No commit unless explicitly requested.
