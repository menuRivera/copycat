# Database schemas

## users

- id
- name
- email

## projects

- id
- user_id (owner)
- active
- name
- created_at
- repo_url (required, set at project creation)
- deployment_url (optional for now)
- ingest_token (generated; authenticates analytics ingestion for this project)
- version

## competitors

- id
- project_id
- active
- name
- url

## snapshots

- id
- project_id (owner project)
- competitor_id (nullable; null for our own site captures)
- kind (competitor, own)
- created_at
- dom_snapshot
- dom_hash (for quickly detect no changes)

## screenshots

- id
- title
- snapshot_id
- screenshot_bucket_id
- screenshot_public_url

## diffs

- id
- project_id
- competitor_id
- type (snapshot, analytic, init)
- old_screenshot_id (prev state)
- new_screenshot_id (new state)
- title
- description (human readable)
- instruction (for agents)
- area (product area, e.g. Hero, Checkout, Mobile)
- impact (low, medium, high)
- expected_outcome (what happens once applied)
- statement (from analytic diff generation)
- created_at
- updated_at
- status (created, approved, denied, pr_open, implemented, failed)
- commit
- pr_url (pull request opened by the SDLC flow, when the remote is GitHub)
- validation_status (none, pending, passed, failed, skipped)
- validation_notes (JSON: validation url, http status, console/page errors, screenshot)

## clickhouse (analytics, dev)

events table (`copycat.events`, see `clickhouse/init.sql`):

- project_id (uuid)
- event_type (page_view, click, noop_click, load_time, api_req)
- page, section, element
- duration_ms
- x, y (click coordinates, 0 when unknown; heatmap data)
- ts (DateTime)

Metrics are aggregated per calendar month (this vs previous) into `{ metric, thisMonth, prevMonth, delta }` rows by the worker, including a `funnel_visit_to_click_pct` funnel metric. Ingestion (otel + signoz) is not wired yet; the worker runs a local ingest server (`pnpm --filter worker ingest`, `POST /ingest` with a project `ingest_token`) and dev data can be seeded with `pnpm --filter worker seed:analytics <projectId>`.
