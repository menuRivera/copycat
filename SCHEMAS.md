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
- statement (from analytic diff generation)
- created_at
- updated_at
- status (created, approved, denied, implemented, failed)
- commit

## clickhouse (analytics, dev)

events table (`copycat.events`, see `clickhouse/init.sql`):

- project_id (uuid)
- event_type (page_view, click, noop_click, load_time, api_req)
- page, section, element
- duration_ms
- ts (DateTime)

Metrics are aggregated per calendar month (this vs previous) into `{ metric, thisMonth, prevMonth, delta }` rows by the worker. Ingestion (otel + signoz) is not wired yet; dev data is seeded with `pnpm --filter worker seed:analytics <projectId>`.
