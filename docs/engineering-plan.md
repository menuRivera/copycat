# Engineering plan

Executable decomposition of Copycat into tasks with acceptance criteria, dependencies and execution order. Tasks marked Done reflect the current repository; Open tasks are the known remaining work.

## Conventions

- Monorepo via pnpm workspaces: `apps/web`, `apps/worker`, `packages/core`.
- Pure logic in `packages/core` (testable without network); side effects in worker activities.
- Zod at every boundary: env vars, LLM structured output, ingest payloads, project form.
- Quality gates before finishing any task: `pnpm lint && pnpm typecheck && pnpm test`.
- Destructive database operations (`supabase db reset`) require explicit confirmation; pending migrations are applied with `supabase migration up`.

## Tasks

### T1 — Scaffold and shared core (Done)

Scope: workspace layout, TypeScript strict config, env parsing, DOM hashing, zod schemas, Supabase schema + RLS + storage bucket migrations, generated DB types.

Acceptance: `pnpm install` works; `env.test.ts`, `hash.test.ts`, schema tests pass; migrations apply on a fresh local database; RLS allows owners only.

Depends on: none.

### T2 — Project creation flow (Done)

Scope: magic-link auth, project form (name, `repo_url`, optional `deployment_url`, at least one competitor), insert project + competitors, start `snapshotScanWorkflow` in `gap`/`init` mode.

Acceptance: invalid forms show field errors; competitor URLs must be absolute http(s); the request returns without waiting for captures or LLM calls; project appears in the selector with a pending badge.

Depends on: T1.

### T3 — Snapshot scan and diff creation (Done)

Scope: `snapshotScanWorkflow` with `changes|gap|init` modes, Playwright DOM capture, DOM hashing, LLM dom-diff, Noul visual gate, old/new section screenshots, VLM description when visual, diff fields generation.

Acceptance: identical DOM hashes create no rows; a changed competitor produces one diff per relevant change with old/new screenshots; screenshots are uploaded to the `screenshots` bucket before the diff row; failed targets do not abort other targets.

Depends on: T2.

### T4 — Analytics scan and diff creation (Done)

Scope: ClickHouse schema and client, deterministic metric aggregation (this vs previous month), LLM statements, Noul diff-worthy filter, analytic diff creation with the originating statement.

Acceptance: `seed:analytics` produces month-over-month metrics; only diff-worthy statements create rows; each analytic diff persists its statement; empty metrics skip the project.

Depends on: T1.

### T5 — Approval UI (Done)

Scope: project selector, Pending/Decided/Shipped tabs, approve/deny server actions, Temporal workflow start with `workflowId: diff-{id}`, Change Intelligence card (area, impact, proposed change, evidence, expected outcome, screenshots, instruction).

Acceptance: only `created` diffs show actions; approval is idempotent; cards are understandable without reading code; denied/approved rows leave Pending immediately.

Depends on: T3, T4.

### T6 — SDLC happy path (Done)

Scope: `diffImplementationWorkflow` (plan → implement → review → release), per-project serialization, git worktree sandbox, Noul review with tests, merge/push release path.

Acceptance: invalid implementations retry up to 3 rounds with a refined plan; exhaustion marks `failed`; valid change merges `--no-ff` and records the commit; concurrent diffs for one project serialize; different projects run in parallel.

Depends on: T1.

### T7 — Change Intelligence fields and evidence UI (Done)

Scope: `area`, `impact` (`low|medium|high`), `expected_outcome` columns and generation in all diff types; analytics statement rendered as evidence; "If approved" callout.

Acceptance: every new diff carries the three fields; migration is additive; old rows render with nulls; schema tests cover required fields and unknown impact rejection.

Depends on: T3, T4, T5.

### T8 — PR handoff and browser validation (Done)

Scope: push branch for every valid change, GitHub PR creation with graceful degradation, preview URL resolution (env → GitHub deployments poll → `deployment_url`), Playwright validation with screenshot evidence, `pr_open` status, validation badges in the UI.

Acceptance: GitHub remotes get a PR and `pr_open` status without auto-merge; non-GitHub remotes fall back to the merge path; validation failure sets `failed` and leaves any PR open; skipped validation records a reason; `pnpm typecheck && pnpm test` pass including `parseGitHubRepo` tests.

Depends on: T6, T7.

### T9 — Analytics ingestion and funnels (Done)

Scope: per-project `ingest_token`, worker ingest server (`POST /ingest`, zod validation, CORS, size limit), ClickHouse `x`/`y` coordinates, visit-to-click funnel metric.

Acceptance: unknown tokens get 401; invalid payloads get 400; accepted events land in `copycat.events`; funnel metric appears in structured metrics and is unit tested.

Depends on: T4.

### T10 — Demo fixture and runbook (Done)

Scope: local competitor fixture with version toggle, local target repository, preview server that serves the newest diff worktree, setup script, demo runbook.

Acceptance: `pnpm demo:repo:setup` creates a bare remote with the target app; `pnpm demo:competitor` serves v1/v2; the target app test suite passes with `npm test`; the runbook drives competitor-change and behavior-opportunity demos end to end.

Depends on: T8, T9.

### Open — Known remaining work

| Task | Scope                                                               | Why it remains                                                                    |
| ---- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| T11  | OTel/Signoz ingestion for production analytics                      | Local ingest server is the demo path; otel collector wiring was out of scope      |
| T12  | Heatmap grid UI (click coordinates are captured but not visualized) | Evidence for no-op clicks is text-based today                                     |
| T13  | Edit projects / add competitors after creation                      | Creation-time registration is the current supported path                          |
| T14  | Post-merge deploy health checks and automatic revert                | Deployment is owned by the hosting platform; the workflow stops at a validated PR |
| T15  | External session replay, feature flags, experiments                 | Requires adopting a platform like PostHog; not in the current stack               |

## Execution order

1. T1 foundation → T2 project creation.
2. T3 + T4 detection pipelines (independent, can run in parallel) → T5 review UI.
3. T6 SDLC happy path (parallel to T3–T5) → T7 intelligence fields → T8 PR + validation.
4. T9 ingestion → T10 demo.
5. Gates after every task: `pnpm lint && pnpm typecheck && pnpm test`; manual workflow verification via Temporal UI and the demo runbook.

## Contracts and interfaces

### Temporal workflows

| Workflow                     | Input                                                            | Output                                                           |
| ---------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| `snapshotScanWorkflow`       | `{ projectIds?: string[]; mode?: 'changes' \| 'gap' \| 'init' }` | `{ scanned: number; diffsCreated: number }`                      |
| `analyticsScanWorkflow`      | none                                                             | `{ projects: number; statements: number; diffsCreated: number }` |
| `diffImplementationWorkflow` | `{ diffId: string }`                                             | `{ status: string; commit?: string; prUrl?: string }`            |

Workflow IDs: `diff-{diffId}` (approval, `ALLOW_DUPLICATE`), `snapshot-scan-manual-{ts}`, `analytics-scan-manual-{ts}`, `project-setup-{projectId}-{ts}`.

### Key activities

- `captureSnapshot`, `getPreviousSnapshot`, `captureScreenshots`, `createDiff`, `createInitDiff`, `captureOwnSnapshot`.
- `retrieveMetrics`, `generateStatements`, `filterDiffWorthy`, `generateAnalyticDiff`, `createAnalyticDiff`.
- `getDiffData`, `prepareDiffWorktree`, `planChange`, `implementChange`, `reviewChange`, `pushDiffBranch`, `openPullRequestForDiff`, `resolveValidationUrl`, `validateChange`, `releaseChange`, `updateDiffStatus`, `updateDiffValidation`.

### Data contracts

- Diff row: `title`, `description`, `instruction`, `area`, `impact`, `expected_outcome`, plus evidence (`old_screenshot_id`, `new_screenshot_id`, `statement`) and lifecycle (`status`, `commit`, `pr_url`, `validation_status`, `validation_notes`). See `SCHEMAS.md`.
- Storage paths: `{competitorId}/{snapshotId}/diff-{i}/old.png`, `{competitorId}/{snapshotId}/diff-{i}/new.png`, `{competitorId}/{snapshotId}/init/new.png`, `validation/{diffId}/{ts}.png`.
- Ingest API: `POST /ingest` with `{ token, events: [...] }` (max 500 events, 1 MiB body) → `202 { accepted }`; `GET /health` → `200 { ok }`. Event types: `page_view`, `click`, `noop_click`, `load_time`, `api_req`.
- Detector policy: a single Noul threshold (`0.5`) shared by all detectors; claims must pass `score > 0.5`.

### Environment

Variables are declared in `.env.example`: Supabase URL/anon/service keys, `TYPESAFE_API_KEY`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, Temporal address/namespace/task queue, `GITHUB_TOKEN`, `VALIDATION_URL`, `WORKSPACE_DIR`, `INGEST_PORT`, ClickHouse URL/credentials/database.

## Testing strategy

- Unit tests (vitest): `packages/core` — hashing, metric aggregation and deltas, funnel metric, zod schemas, env parsing; `apps/worker` — GitHub repo parsing and degradation rules.
- Static checks: ESLint across the repo; `tsc --noEmit` for core/worker; `next typegen && tsc --noEmit` for web.
- Manual integration: run the local stack and trigger `pnpm --filter worker scan [mode] [projectId]` / `pnpm --filter worker analytics`; inspect runs in Temporal UI (`localhost:8080`).
- End-to-end: `docs/demo.md` runbook covers competitor-change and behavior-opportunity scenarios through approval, implementation, validation and status.
- Gate: `pnpm lint && pnpm typecheck && pnpm test` must pass after every task.
