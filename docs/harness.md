# Harness: agents, tools and how to run them

The harness is the reproducible system that executes the engineering plan: a single Temporal worker process hosting workflows, activities, the coding agent, LLM/VLM calls and the analytics ingest server. Everything runs locally with Docker + Supabase + the demo fixtures, and every side effect is retryable and traceable from Temporal.

## Agent roster

| Role                 | Implementation                                           | Framework / tools                                               | Where                                                             |
| -------------------- | -------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| Orchestrator         | Temporal workflows + schedules                           | `@temporalio/worker`, cron schedules, per-project serialization | `apps/worker/src/workflows/`, `src/scripts/register-schedules.ts` |
| Browser / research   | DOM capture, section screenshots, gap analysis over DOMs | Playwright + vercel/ai `generateObject` (gap)                   | `lib/capture.ts`, `lib/llm.ts` (`generateGapDiffs`)               |
| Visual analysis      | Visual-diff gate + image description                     | TypeSafe Noul + VLM (`generateText` with images)                | `lib/typesafe.ts`, `lib/llm.ts` (`describeVisualDiff`)            |
| Analytics            | Metrics → statements → diff-worthy gate → proposal       | Deterministic aggregation + vercel/ai + Noul                    | `lib/clickhouse.ts`, `analyticsActivities.ts`                     |
| Coding               | Plan, implement, refine in a git worktree                | Claude Agent SDK (`query`) with scoped tool allowlists          | `lib/agent.ts`, `diffActivities.ts`                               |
| Testing / validation | Repo tests + Noul review, browser validation             | `npm test` subprocess, TypeSafe Noul, Playwright                | `lib/git.ts` (`runTests`), `lib/validate.ts`                      |

Separate long-lived agent processes are intentionally not used. Rationale: Temporal already provides durable execution, retries, timeouts and isolation per activity; agents differ by tool allowlist and prompt, not by runtime. This keeps the harness reproducible with one process and makes every agent step observable in the Temporal UI.

## How the pieces connect

- `planChange` runs the coding agent with read-only tools (`Read`, `Glob`, `Grep`), max 30 turns, no edits.
- `implementChange` runs the agent with edit tools (`Read`, `Edit`, `Write`, `Bash`, `Glob`, `Grep`), max 80 turns, then the harness commits.
- `reviewChange` is non-agentic (git diff + tests) plus a typed Noul verdict; on failure a refine agent produces the next plan.
- `validateChange` runs against a resolved URL and stores screenshot evidence.
- Typed detectors always use one Noul question with a numeric answer; the shared threshold is `0.5` (`lib/typesafe.ts`).

## Run the harness

Prerequisites: Node 24, pnpm 10, Docker, Supabase CLI, and the env from `.env.example`.

```bash
pnpm install
cp .env.example .env          # fill from `supabase status`
docker compose up -d          # Temporal + ClickHouse
supabase start
pnpm --filter worker schedule # register daily/monthly cron
pnpm dev:worker               # Temporal worker (workflows + activities)
pnpm dev:web                  # review UI
pnpm --filter worker ingest   # optional: analytics ingest server (port 8787)
```

Manual triggers (same code paths as cron):

```bash
pnpm --filter worker scan                  # daily competitor scan (changes)
pnpm --filter worker scan gap <projectId>  # creation-style gap scan
pnpm --filter worker scan init <projectId> # setup diff from competitor
pnpm --filter worker analytics             # monthly analytics scan
pnpm --filter worker seed:analytics <projectId>
```

Reproducibility: workflows write clones/worktrees under `workspace/` (gitignored, `WORKSPACE_DIR` override), events come from the local ingest server or the seed script, and `docs/demo.md` provides a deterministic competitor fixture and target repository. Temporal workflow IDs make retriggering safe.

## Add an agent or tool

1. Add a zod schema in `packages/core` for the structured output (LLM) or payload (tool).
2. Implement the side effect as an exported activity function in `apps/worker/src` (one activity = one side effect; idempotent where practical).
3. Use `runAgent` for repo tasks (choose the minimal tool allowlist and a turn budget) or `generateObject`/`generateText` for LLM/VLM calls.
4. For verdicts, add a typed Noul question in `lib/typesafe.ts` instead of parsing model text.
5. Call the activity from workflow code with `proxyActivities` timeouts; keep workflow code deterministic (no DB/network/env access inline).
6. Export the activity through `src/activities.ts` so the worker registers it.
7. Add unit tests for the pure parts and a manual trigger script if the activity is user-facing.

## Observability

- Temporal UI (`http://localhost:8080`) shows schedules, runs, retries and per-activity input/output.
- Worker logs include `project_id`/`diff_id` where available and never log tokens or keys.
- Screenshots (evidence and validation) are stored in the public-read `screenshots` Supabase bucket and linked from diffs.
