# Copycat

This project is an **automated, continuous product optimization and competitive intelligence system** designed to monitor analytics and competitor changes, convert insightful deltas into actionable instructions, and automatically implement code changes after human approval.

## Development

Prerequisites: Node 24, pnpm 10, Docker, Supabase CLI.

```bash
pnpm install
cp .env.example .env     # fill from `supabase status`: API_URL, ANON_KEY (+ SERVICE_ROLE for the worker)
docker compose up -d     # Temporal dev server (UI: http://localhost:8080)
supabase start           # local Postgres/Auth/Storage
pnpm dev:web             # Next.js: http://localhost:3000 (falls back to 3001 if busy)
pnpm dev:worker          # Temporal worker
```

Both apps load the single repo-root `.env` (web injects it via `apps/web/scripts/next-with-env.mjs`). Magic-link emails land in Mailpit at http://127.0.0.1:54324.

Quality gates before finishing any change: `pnpm lint && pnpm typecheck && pnpm test`.
