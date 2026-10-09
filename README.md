# Copycat

Automated, continuous product optimization and competitive intelligence. Copycat monitors competitor sites and product analytics, turns the deltas into reviewable change proposals ("diffs"), and after human approval a coding agent implements, tests and validates the change before it can reach production.

## Quick start

Prerequisites: Node 24, pnpm 10, Docker, Supabase CLI.

```bash
pnpm install
cp .env.example .env     # fill from `supabase status` (+ ANTHROPIC_API_KEY, TYPESAFE_API_KEY)
docker compose up -d     # Temporal (UI: http://localhost:8080) + ClickHouse
supabase start
supabase migration up
pnpm --filter worker schedule   # register the daily and monthly scans
pnpm dev:web                    # Next.js: http://localhost:3000
pnpm dev:worker                 # Temporal worker
```

Both apps load the single repo-root `.env` (web injects it via `apps/web/scripts/next-with-env.mjs`). Magic-link emails land in Mailpit at http://127.0.0.1:54324.

## Documentation

| Topic                                                            | Where                      |
| ---------------------------------------------------------------- | -------------------------- |
| Architecture, components, boundaries, alternatives, decisions    | `docs/architecture.md`     |
| Engineering plan: tasks, acceptance criteria, contracts, testing | `docs/engineering-plan.md` |
| Harness: agents, tools, how to run and extend                    | `docs/harness.md`          |
| Analytics: events, ingestion, metrics, funnels                   | `docs/analytics.md`        |
| End-to-end demo runbook                                          | `docs/demo.md`             |
| Database schemas                                                 | `SCHEMAS.md`               |
| Tech stack                                                       | `STACK.md`                 |
| Detailed flow diagrams                                           | `flows/`                   |
| Initial system design (Excalidraw source)                        | `flowcharts.excalidraw`    |

## Design source

`flowcharts.excalidraw` is the original, fundamental design of the system, kept as the reference starting point. GitHub does not render `.excalidraw` files.

- **Manual (always works):** open https://excalidraw.com, then menu → Open (or drag & drop the file) and select `flowcharts.excalidraw`.
- **One-click deep link:** https://excalidraw.com/#url=https://raw.githubusercontent.com/menuRivera/copycat/main/flowcharts.excalidraw
- **VS Code:** the Excalidraw extension renders the file inline.

Note: `flows/` and `docs/architecture.md` describe the current implementation and have diverged from the original design; they are not exports of this file.

## Common tasks

**Add a website / competitor:** sign in, use the "New project" form. `name`, `repo_url` and at least one competitor URL are required; `deployment_url` is optional. Competitors are registered at creation time (editing a project later is not supported yet). With `deployment_url` set, creation runs a gap analysis against each competitor; otherwise it creates a setup diff per competitor.

**Configure periodic runs:** `pnpm --filter worker schedule` registers `snapshot-scan-daily` (03:00 UTC) and `analytics-scan-monthly` (1st, 03:00 UTC). Manual triggers with the same code paths: `pnpm --filter worker scan [changes|gap|init] [projectId]` and `pnpm --filter worker analytics`.

**Run the harness:** see `docs/harness.md`. In short: local stack + worker + `pnpm --filter worker schedule`; every agent step is observable in Temporal UI.

**Configure analytics:** events are ingested per project with an `ingest_token` via the worker ingest server (`pnpm --filter worker ingest`, `POST /ingest`) or seeded locally with `pnpm --filter worker seed:analytics <projectId>`. Details in `docs/analytics.md`.

**Run tests:** `pnpm test`. Full gate before finishing any change: `pnpm lint && pnpm typecheck && pnpm test`.

**Add an agent or tool:** follow the activity pattern in `docs/harness.md` — zod schema in `packages/core`, side effect as an exported activity, typed Noul questions for verdicts, deterministic workflow code only.

## CI and deploys

- `.github/workflows/ci.yml` (PRs + main): lint, typecheck, tests, migration validation (`supabase db start` + `supabase db reset`) and mermaid diagram validation.
- `.github/workflows/deploy-migrations.yml`: manual (`workflow_dispatch`) `supabase db push` to the hosted Supabase project. To use it, set the repo secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID` and `SUPABASE_DB_PASSWORD`.

## Known limitations

- Analytics ingestion uses a local ingest server for the demo; OTel/Signoz production wiring is pending. No session replay, feature flags or experiments.
- Click coordinates are captured but the heatmap grid is not rendered yet.
- Projects cannot be edited or gain competitors after creation.
- Deployment of merged PRs is owned by the hosting platform; there are no post-deploy health checks or automatic reverts.
- The PR path needs a GitHub remote and `GITHUB_TOKEN`; other remotes fall back to a validated local merge.
