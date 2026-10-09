import { describe, expect, it } from 'vitest';
import { buildStructuredMetrics, toMetricMap, type AggregatedEventRow } from './metrics';

const rows: AggregatedEventRow[] = [
  { event_type: 'page_view', page: '/', section: '', element: '', count: 400, avg_duration: 30_000 },
  {
    event_type: 'page_view',
    page: '/pricing',
    section: '',
    element: '',
    count: 100,
    avg_duration: 20_000,
  },
  { event_type: 'click', page: '/', section: '', element: 'buy', count: 50, avg_duration: 0 },
  { event_type: 'click', page: '/', section: '', element: 'docs', count: 80, avg_duration: 0 },
  {
    event_type: 'noop_click',
    page: '/',
    section: 'contact',
    element: '',
    count: 30,
    avg_duration: 0,
  },
  { event_type: 'load_time', page: '/', section: '', element: '', count: 2, avg_duration: 1000 },
  { event_type: 'load_time', page: '/', section: '', element: '', count: 2, avg_duration: 1500 },
  { event_type: 'api_req', page: '/', section: '', element: '', count: 2, avg_duration: 300 },
];

describe('toMetricMap', () => {
  it('aggregates totals, averages and breakdowns', () => {
    const map = toMetricMap(rows);
    expect(map.get('page_visits')).toBe(500);
    expect(map.get('page_visits:/')).toBe(400);
    expect(map.get('page_visits:/pricing')).toBe(100);
    expect(map.get('clicks:buy')).toBe(50);
    expect(map.get('noop_clicks:contact')).toBe(30);
    expect(map.get('avg_time_on_page_ms')).toBe(28_000);
    expect(map.get('avg_load_time_ms')).toBe(1_250);
    expect(map.get('avg_api_req_ms')).toBe(300);
  });

  it('ignores empty breakdown keys', () => {
    const map = toMetricMap([
      { event_type: 'click', page: '', section: '', element: '', count: 5, avg_duration: 0 },
    ]);
    expect([...map.keys()]).not.toContain('clicks:');
  });
});

describe('buildStructuredMetrics', () => {
  it('unions keys, computes deltas and sorts by absolute delta', () => {
    const current = new Map([
      ['page_visits', 470],
      ['clicks:buy', 44],
    ]);
    const previous = new Map([
      ['page_visits', 400],
      ['clicks:buy', 50],
      ['clicks:docs', 10],
    ]);
    const metrics = buildStructuredMetrics(current, previous);
    expect(metrics.map((m) => m.metric)).toEqual(['page_visits', 'clicks:docs', 'clicks:buy']);
    expect(metrics[0]).toEqual({ metric: 'page_visits', thisMonth: 470, prevMonth: 400, delta: 70 });
    expect(metrics[1]).toEqual({ metric: 'clicks:docs', thisMonth: 0, prevMonth: 10, delta: -10 });
    expect(metrics[2]).toEqual({ metric: 'clicks:buy', thisMonth: 44, prevMonth: 50, delta: -6 });
  });
});
