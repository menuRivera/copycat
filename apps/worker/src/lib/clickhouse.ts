import { createClient, type ClickHouseClient } from '@clickhouse/client';
import {
  buildStructuredMetrics,
  env,
  toMetricMap,
  type AggregatedEventRow,
  type StructuredMetric,
} from '@copycat/core';

export type SeedEvent = {
  project_id: string;
  event_type: string;
  page: string;
  section: string;
  element: string;
  duration_ms: number;
  ts: string;
};

let client: ClickHouseClient | null = null;

function getClient(): ClickHouseClient {
  client ??= createClient({
    url: env.CLICKHOUSE_URL ?? 'http://localhost:8123',
    username: env.CLICKHOUSE_USERNAME ?? 'copycat',
    password: env.CLICKHOUSE_PASSWORD ?? 'copycat',
    database: env.CLICKHOUSE_DATABASE ?? 'copycat',
  });
  return client;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function monthWindow(offset: number, now: Date): { from: string; to: string } {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 1));
  return { from: formatDate(from), to: formatDate(to) };
}

async function aggregate(
  projectId: string,
  window: { from: string; to: string },
): Promise<Map<string, number>> {
  const result = await getClient().query({
    query: `
      SELECT event_type, page, section, element, count() AS count, avg(duration_ms) AS avg_duration
      FROM events
      WHERE project_id = {projectId:UUID}
        AND ts >= {from:DateTime}
        AND ts < {to:DateTime}
      GROUP BY event_type, page, section, element
    `,
    query_params: { projectId, from: window.from, to: window.to },
    format: 'JSONEachRow',
  });

  const rows = await result.json<AggregatedEventRow>();
  return toMetricMap(rows);
}

export async function retrieveStructuredMetrics(projectId: string): Promise<StructuredMetric[]> {
  const now = new Date();
  const [current, previous] = await Promise.all([
    aggregate(projectId, monthWindow(0, now)),
    aggregate(projectId, monthWindow(-1, now)),
  ]);
  return buildStructuredMetrics(current, previous);
}

export async function insertEvents(rows: SeedEvent[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await getClient().insert({ table: 'events', values: rows, format: 'JSONEachRow' });
}
