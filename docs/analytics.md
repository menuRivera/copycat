# Analytics and observability

Copycat turns product analytics into change proposals. Events land in ClickHouse, the worker computes deterministic month-over-month metrics, an LLM writes specific statements, a typed detector filters them, and accepted statements become diffs with the originating evidence attached.

## Platform

- Event store: ClickHouse (`copycat.events`), schema in `clickhouse/init.sql`.
- Production mental model: OpenTelemetry + Signoz as the ingestion/observability layer (see `STACK.md`), ClickHouse as the queryable store.
- Demo/dev path: the worker runs a local ingest server and a seed script writes synthetic events.
- Alternative considered: PostHog (session replay, heatmaps, flags, experiments) — not adopted; the current stack keeps raw events cheap and the model explicit. See `docs/architecture.md`.

## Event schema

| Column | Values |
| --- | --- |
| `project_id` | UUID of the project |
| `event_type` | `page_view`, `click`, `noop_click`, `load_time`, `api_req` |
| `page`, `section`, `element` | Page path and DOM identifiers |
| `duration_ms` | Time on page, load time or API duration |
| `x`, `y` | Click coordinates (0 when unknown; captured for future heatmaps) |
| `ts` | Event timestamp (DateTime) |

## Configure ingestion

1. Each project gets an `ingest_token` at creation. The worker looks it up with the service role; the token is never logged.
2. Start the ingest server: `pnpm --filter worker ingest` (port from `INGEST_PORT`, default `8787`).
3. Send batches (max 500 events, 1 MiB):

```bash
curl -X POST http://localhost:8787/ingest \
  -H 'content-type: application/json' \
  -d '{
    "token": "<project ingest_token>",
    "events": [
      { "event_type": "page_view", "page": "/", "duration_ms": 18000 },
      { "event_type": "noop_click", "page": "/", "section": "contact", "x": 640, "y": 520 }
    ]
  }'
```

`401` means an unknown token, `400` an invalid payload, `202 { accepted }` success. `GET /health` is a readiness probe. A `noop_click` is a click on an element with no associated action — the canonical opportunity signal.

For a real site, send events from a server-side endpoint (or a proxy) so the token is not shipped to visitors. The token is a shared secret for a single project, not a user credential.

## How an opportunity becomes a proposal

1. Monthly schedule (or manual `pnpm --filter worker analytics`) runs `analyticsScanWorkflow`.
2. `retrieveStructuredMetrics` aggregates events per calendar month and computes deltas vs the previous month (`packages/core`).
3. Metrics include: page visits (total and per page), average time on page, clicks per element, no-op clicks per section, visit-to-click funnel conversion (`funnel_visit_to_click_pct`), average load time and average API request time.
4. `generateStatements` (LLM, zod structured output) writes statements like `contact page has 40 no-op clicks, up from 30` with a category and explanation.
5. `filterDiffWorthy` (TypeSafe Noul) drops weak statements; survivors are turned into diffs by `generateAnalyticDiff`, which also sets area, impact and expected outcome.
6. The diff stores the statement JSON as evidence, so the review UI shows the numbers behind the recommendation.

## Local data

```bash
pnpm --filter worker seed:analytics <projectId>   # two months of synthetic events
pnpm --filter worker analytics                     # run the scan
```

The seed produces the canonical scenario: visits up, `buy` clicks down, no-op clicks on `contact` up — enough for the LLM to find a funnel problem and a broken-affordance problem.

## Observability

- Temporal UI (`http://localhost:8080`) shows workflow runs, retries and activity results.
- Worker logs are structured and include `project_id`/`diff_id` where available; secrets are never logged.
- Signoz wiring is the intended production path for traces/metrics and is not part of this iteration.

## Limitations

- No session replay, feature flags, experiments or heatmap visualization yet; coordinates are captured for the heatmap grid (T12 in the engineering plan).
- The local ingest server has body/event limits but no rate limiting; production should sit behind OTel/Signoz or an API gateway.
- Month-over-month comparison is calendar-based and assumes continuous ingestion.
