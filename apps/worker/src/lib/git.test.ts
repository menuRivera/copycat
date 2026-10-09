import { describe, expect, it } from 'vitest';
import { truncate } from './git';

describe('truncate', () => {
  it('returns short input unchanged', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('marks truncated input', () => {
    const truncated = truncate('a'.repeat(20), 10);
    expect(truncated).toBe(`${'a'.repeat(10)}\n<!-- truncated -->`);
  });
});
