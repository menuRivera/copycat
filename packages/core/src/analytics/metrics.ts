export type AggregatedEventRow = {
  event_type: string;
  page: string;
  section: string;
  element: string;
  count: number;
  avg_duration: number;
};

export type StructuredMetric = {
  metric: string;
  thisMonth: number;
  prevMonth: number;
  delta: number;
};

const MAX_BREAKDOWNS = 10;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function topEntries(map: Map<string, number>): [string, number][] {
  return [...map.entries()]
    .filter(([key]) => key.length > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_BREAKDOWNS);
}

export function toMetricMap(rows: AggregatedEventRow[]): Map<string, number> {
  const totals = new Map<string, number>();
  const pageVisits = new Map<string, number>();
  const clicks = new Map<string, number>();
  const noopClicks = new Map<string, number>();

  let pageViewCount = 0;
  let pageViewDuration = 0;
  let clickCount = 0;
  let loadDuration = 0;
  let loadCount = 0;
  let apiDuration = 0;
  let apiCount = 0;

  for (const row of rows) {
    switch (row.event_type) {
      case 'page_view':
        pageViewCount += row.count;
        pageViewDuration += row.avg_duration * row.count;
        pageVisits.set(row.page, (pageVisits.get(row.page) ?? 0) + row.count);
        break;
      case 'click':
        clickCount += row.count;
        clicks.set(row.element, (clicks.get(row.element) ?? 0) + row.count);
        break;
      case 'noop_click':
        noopClicks.set(row.section, (noopClicks.get(row.section) ?? 0) + row.count);
        break;
      case 'load_time':
        loadDuration += row.avg_duration * row.count;
        loadCount += row.count;
        break;
      case 'api_req':
        apiDuration += row.avg_duration * row.count;
        apiCount += row.count;
        break;
    }
  }

  totals.set('page_visits', pageViewCount);
  if (pageViewCount > 0 && clickCount > 0) {
    totals.set('funnel_visit_to_click_pct', round((clickCount / pageViewCount) * 100));
  }
  if (pageViewCount > 0) {
    totals.set('avg_time_on_page_ms', round(pageViewDuration / pageViewCount));
  }
  if (loadCount > 0) {
    totals.set('avg_load_time_ms', round(loadDuration / loadCount));
  }
  if (apiCount > 0) {
    totals.set('avg_api_req_ms', round(apiDuration / apiCount));
  }
  for (const [page, count] of topEntries(pageVisits)) {
    totals.set(`page_visits:${page}`, count);
  }
  for (const [element, count] of topEntries(clicks)) {
    totals.set(`clicks:${element}`, count);
  }
  for (const [section, count] of topEntries(noopClicks)) {
    totals.set(`noop_clicks:${section}`, count);
  }

  return totals;
}

export function buildStructuredMetrics(
  current: Map<string, number>,
  previous: Map<string, number>,
): StructuredMetric[] {
  const keys = new Set([...current.keys(), ...previous.keys()]);

  return [...keys]
    .map((metric) => {
      const thisMonth = current.get(metric) ?? 0;
      const prevMonth = previous.get(metric) ?? 0;
      return { metric, thisMonth, prevMonth, delta: round(thisMonth - prevMonth) };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.metric.localeCompare(b.metric));
}
