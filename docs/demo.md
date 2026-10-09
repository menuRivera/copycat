# End-to-end demo

Two scripted scenarios: a competitor change (minimum) and a behavior opportunity (with user data). Everything runs locally with the demo fixtures; no external websites or repositories are required.

## One-time setup

```bash
pnpm install
cp .env.example .env            # fill Supabase keys, ANTHROPIC_API_KEY, TYPESAFE_API_KEY (from `supabase status` and your providers)
docker compose up -d            # Temporal + ClickHouse
supabase start
supabase migration up           # apply pending migrations
pnpm --filter worker schedule   # register daily/monthly cron (optional for the demo)
pnpm demo:repo:setup            # creates demo/.runtime/origin/target.git and prints its path
```

Add to `.env` for local browser validation:

```bash
VALIDATION_URL=http://localhost:4401
```

Start the long-running processes (separate terminals):

```bash
pnpm dev:worker                 # Temporal worker
pnpm dev:web                    # review UI on http://localhost:3000
pnpm demo:competitor            # competitor fixture on http://localhost:4400 (v1)
pnpm demo:preview               # preview server for the newest diff worktree on http://localhost:4401
```

Then sign in to the web UI (magic link lands in Mailpit at `http://127.0.0.1:54324`) and create a project:

- name: `Demo`
- repo_url: the path printed by `pnpm demo:repo:setup` (e.g. `<repo>/demo/.runtime/origin/target.git`)
- deployment_url: leave empty
- competitor: `http://localhost:4400` (this is the single competitor used by the demo)

Project creation runs the `init` scan: one setup diff per competitor appears in Pending.

## Scenario A — competitor change

1. Confirm the baseline: Pending shows the setup diff; the competitor site serves v1 (`curl http://localhost:4400/ | grep data-version`).
2. Trigger the daily scan manually (same code path as the cron):

   ```bash
   pnpm --filter worker scan changes <projectId>
   ```

   Nothing new yet: the DOM hash is unchanged.

3. Change the competitor:

   ```bash
   curl -X POST http://localhost:4400/version -d 2
   ```

4. Run the scan again. The worker captures the new DOM, diffs it against the stored snapshot, asks Noul whether the change is visual, captures old/new section screenshots, and creates a snapshot diff.

5. Review the diff in the UI: area, impact, proposed change, old/new screenshots, expected outcome, and the agent instruction. Approve it.

6. Watch Temporal UI (`http://localhost:8080`, workflow `diff-<diffId>`): plan → implement → review (git diff + `npm test`). The demo remote is a local bare repository, so PR creation is skipped and the harness falls back to the local release path.

7. Browser validation runs against `VALIDATION_URL=http://localhost:4401`. The preview server serves the newest diff worktree, so it sees the agent's changed page. The result is recorded as a validation badge.

8. Shipped tab: status `implemented`, commit link, validation `passed`. Verify the change is on `main`:

   ```bash
   git --git-dir=demo/.runtime/origin/target.git log --oneline -3
   git --git-dir=demo/.runtime/origin/target.git show --stat HEAD
   ```

Note: with a real GitHub `repo_url` and `GITHUB_TOKEN`, step 6 instead pushes the branch and opens a pull request (status `pr_open`), and validation targets the PR preview deployment when the platform exposes one. Nothing is auto-merged: the human merges the validated PR.

## Scenario B — behavior opportunity

1. Seed two months of product events for the project (or POST the same events to the ingest server with the project's `ingest_token`):

   ```bash
   pnpm --filter worker seed:analytics <projectId>
   ```

   The seed simulates visits up, `buy` clicks down and no-op clicks on `contact` up.

2. Run the analytics scan:

   ```bash
   pnpm --filter worker analytics
   ```

3. A new analytic diff appears in Pending. Its Evidence block shows the statement and numbers (e.g. contact no-op clicks up month over month, funnel conversion down).

4. Approve it and follow the same implementation → validation → shipped flow as Scenario A. The coding agent receives the analytics statement as part of the request.

## Reset

```bash
pnpm demo:repo:setup            # recreate the target remote (drops demo history)
curl -X POST http://localhost:4400/version -d 1   # competitor back to v1
```

ClickHouse holds seeded/sent events; query or truncate `copycat.events` directly if you need a clean slate (destructive, dev only).

## Troubleshooting

- Empty Pending after project creation: the workflow may still be running (LLM calls); follow it in Temporal UI.
- `repository has no commits`: re-run `pnpm demo:repo:setup`.
- Validation `skipped`: `VALIDATION_URL` is unset and the project has no `deployment_url`; set it and re-run an approved diff (workflow IDs are reused, so start a new diff or clear the previous run).
- Agent edits nothing: check `ANTHROPIC_API_KEY` and the Temporal activity logs.
