import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { analyticsIngestSchema, env } from '@copycat/core';
import { createServiceClient } from './lib/supabase';
import { formatClickHouseDate, insertEvents } from './lib/clickhouse';

const MAX_BODY_BYTES = 1024 * 1024;
const DEFAULT_PORT = 8787;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error('payload too large');
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function handleIngest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: unknown;
  try {
    body = JSON.parse(await readBody(req));
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : 'invalid json' });
    return;
  }

  const parsed = analyticsIngestSchema.safeParse(body);
  if (!parsed.success) {
    sendJson(res, 400, { error: 'invalid payload', issues: parsed.error.issues.slice(0, 5) });
    return;
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('ingest_token', parsed.data.token)
    .eq('active', true)
    .maybeSingle();

  if (!data) {
    sendJson(res, 401, { error: 'unknown ingest token' });
    return;
  }

  const ts = formatClickHouseDate(new Date());
  const events = parsed.data.events.map((event) => ({
    project_id: data.id,
    ...event,
    ts,
  }));

  await insertEvents(events);
  console.log(`ingest accepted=${events.length} project=${data.id}`);
  sendJson(res, 202, { accepted: events.length });
}

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }
  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { ok: true });
    return;
  }
  if (req.method === 'POST' && req.url === '/ingest') {
    handleIngest(req, res).catch((error: unknown) => {
      console.error('ingest failed', error);
      sendJson(res, 500, { error: 'internal error' });
    });
    return;
  }
  sendJson(res, 404, { error: 'not found' });
});

const port = Number(env.INGEST_PORT ?? DEFAULT_PORT);
server.listen(port, () => {
  console.log(`ingest server listening on http://localhost:${port} (POST /ingest)`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
