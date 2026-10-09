import { insertEvents, type SeedEvent } from '../lib/clickhouse';

const projectId: string = process.env.SEED_PROJECT_ID ?? process.argv[2] ?? '';
if (!projectId) {
  console.error('usage: pnpm --filter worker seed:analytics <projectId>');
  process.exit(1);
}

const now = new Date();

function monthStart(offset: number): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
}

function spreadTs(monthStartDate: Date, index: number, total: number, cap: Date): string {
  const endMs = Math.min(monthStartDate.getTime() + 20 * 24 * 3600 * 1000, cap.getTime() - 1000);
  const startMs = Math.min(monthStartDate.getTime() + 1000, endMs);
  const span = Math.max(endMs - startMs, 1000);
  return new Date(startMs + Math.floor((span * index) / total))
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
}

type EventSpec = {
  event_type: string;
  page: string;
  section: string;
  element: string;
  count: number;
  duration: (index: number) => number;
};

function buildEvents(specs: EventSpec[], monthStartDate: Date, cap: Date): SeedEvent[] {
  const events: SeedEvent[] = [];
  for (const spec of specs) {
    for (let index = 0; index < spec.count; index++) {
      events.push({
        project_id: projectId,
        event_type: spec.event_type,
        page: spec.page,
        section: spec.section,
        element: spec.element,
        duration_ms: spec.duration(index),
        ts: spreadTs(monthStartDate, index, spec.count, cap),
      });
    }
  }
  return events;
}

const pageView = (page: string, count: number): EventSpec => ({
  event_type: 'page_view',
  page,
  section: '',
  element: '',
  count,
  duration: (index) => 20_000 + (index % 20) * 1_000,
});

const click = (element: string, count: number): EventSpec => ({
  event_type: 'click',
  page: '/',
  section: '',
  element,
  count,
  duration: () => 0,
});

const noopClick = (section: string, count: number): EventSpec => ({
  event_type: 'noop_click',
  page: '/',
  section,
  element: '',
  count,
  duration: () => 0,
});

const loadTime = (count: number, base: number): EventSpec => ({
  event_type: 'load_time',
  page: '/',
  section: '',
  element: '',
  count,
  duration: (index) => base + (index % 10) * 50,
});

const apiReq = (count: number, base: number): EventSpec => ({
  event_type: 'api_req',
  page: '/',
  section: '',
  element: '',
  count,
  duration: (index) => base + (index % 10) * 10,
});

async function main(): Promise<void> {
  const previous = buildEvents(
    [
      pageView('/', 400),
      pageView('/pricing', 100),
      click('buy', 50),
      click('docs', 80),
      noopClick('contact', 30),
      loadTime(20, 1200),
      apiReq(20, 300),
    ],
    monthStart(-1),
    monthStart(0),
  );

  const current = buildEvents(
    [
      pageView('/', 470),
      pageView('/pricing', 110),
      click('buy', 44),
      click('docs', 90),
      noopClick('contact', 40),
      loadTime(20, 1500),
      apiReq(20, 320),
    ],
    monthStart(0),
    now,
  );

  await insertEvents(previous);
  await insertEvents(current);

  console.log(
    `seeded ${previous.length + current.length} events for project ${projectId} (prev month: ${previous.length}, current month: ${current.length})`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
