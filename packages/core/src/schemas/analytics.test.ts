import { describe, expect, it } from 'vitest';
import { analyticStatementListSchema } from './analytics';

describe('analyticStatementListSchema', () => {
  it('accepts valid statements', () => {
    const parsed = analyticStatementListSchema.parse({
      statements: [
        { category: 'conversion', statement: 'purchases down 6', explanation: 'ux regression' },
      ],
    });
    expect(parsed.statements).toHaveLength(1);
  });

  it('accepts an empty list', () => {
    expect(analyticStatementListSchema.parse({ statements: [] }).statements).toEqual([]);
  });

  it('rejects a statement without explanation', () => {
    const result = analyticStatementListSchema.safeParse({
      statements: [{ category: 'ux', statement: 'no-op clicks up' }],
    });
    expect(result.success).toBe(false);
  });
});
