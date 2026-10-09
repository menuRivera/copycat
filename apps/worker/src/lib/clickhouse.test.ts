import { describe, expect, it } from 'vitest';
import { formatClickHouseDate, monthWindow } from './clickhouse';

describe('formatClickHouseDate', () => {
  it('formats UTC timestamps for clickhouse', () => {
    expect(formatClickHouseDate(new Date('2026-10-09T12:34:56.789Z'))).toBe('2026-10-09 12:34:56');
  });
});

describe('monthWindow', () => {
  const now = new Date('2026-10-09T12:00:00Z');

  it('returns the current calendar month', () => {
    expect(monthWindow(0, now)).toEqual({
      from: '2026-10-01 00:00:00',
      to: '2026-11-01 00:00:00',
    });
  });

  it('returns the previous calendar month', () => {
    expect(monthWindow(-1, now)).toEqual({
      from: '2026-09-01 00:00:00',
      to: '2026-10-01 00:00:00',
    });
  });

  it('rolls over the year boundary', () => {
    expect(monthWindow(-1, new Date('2026-01-15T00:00:00Z'))).toEqual({
      from: '2025-12-01 00:00:00',
      to: '2026-01-01 00:00:00',
    });
  });
});
