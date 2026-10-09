import { describe, expect, it, vi } from 'vitest';
import { createLogger, errorMessage, formatLogLine } from './logger';

describe('formatLogLine', () => {
  it('serializes level, message and fields as json', () => {
    const line = formatLogLine(
      'info',
      'hello',
      { projectId: 'p1' },
      new Date('2026-10-09T12:00:00Z'),
    );
    expect(JSON.parse(line)).toEqual({
      ts: '2026-10-09T12:00:00.000Z',
      level: 'info',
      msg: 'hello',
      projectId: 'p1',
    });
  });

  it('drops undefined fields', () => {
    const line = formatLogLine('warn', 'x', { a: undefined, b: 1 }, new Date(0));
    expect(JSON.parse(line)).toEqual({
      ts: '1970-01-01T00:00:00.000Z',
      level: 'warn',
      msg: 'x',
      b: 1,
    });
  });
});

describe('createLogger', () => {
  it('merges base fields and routes to the sink', () => {
    const sink = vi.fn();
    const log = createLogger({ component: 'ingest' }, sink);
    log.error('boom', { projectId: 'p1' });

    expect(sink).toHaveBeenCalledTimes(1);
    const [level, line] = sink.mock.calls[0] as [string, string];
    expect(level).toBe('error');
    expect(JSON.parse(line)).toMatchObject({
      level: 'error',
      msg: 'boom',
      component: 'ingest',
      projectId: 'p1',
    });
  });
});

describe('errorMessage', () => {
  it('extracts messages from errors and falls back to string', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('plain')).toBe('plain');
  });
});
