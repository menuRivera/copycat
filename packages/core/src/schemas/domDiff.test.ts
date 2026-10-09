import { describe, expect, it } from 'vitest';
import { domDiffListSchema, diffFieldsSchema, truncateDom } from './domDiff';

describe('domDiffListSchema', () => {
  it('accepts a valid diff list', () => {
    const parsed = domDiffListSchema.parse({
      diffs: [{ selector: '#hero', summary: 'CTA text changed', old_text: 'Buy', new_text: 'Buy now' }],
    });
    expect(parsed.diffs).toHaveLength(1);
  });

  it('rejects a diff without a selector', () => {
    const result = domDiffListSchema.safeParse({
      diffs: [{ selector: '', summary: 'x', old_text: 'a', new_text: 'b' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts an empty diff list', () => {
    expect(domDiffListSchema.parse({ diffs: [] }).diffs).toEqual([]);
  });
});

describe('diffFieldsSchema', () => {
  it('requires title, description and instruction', () => {
    expect(diffFieldsSchema.safeParse({ title: 't', description: 'd' }).success).toBe(false);
    expect(
      diffFieldsSchema.safeParse({ title: 't', description: 'd', instruction: 'i' }).success,
    ).toBe(true);
  });
});

describe('truncateDom', () => {
  it('returns short input unchanged', () => {
    expect(truncateDom('<div>x</div>', 100)).toBe('<div>x</div>');
  });

  it('keeps head and tail when truncating', () => {
    const html = `${'a'.repeat(100)}${'b'.repeat(100)}`;
    const truncated = truncateDom(html, 50);
    expect(truncated.startsWith('a')).toBe(true);
    expect(truncated.endsWith('b')).toBe(true);
    expect(truncated).toContain('truncated');
  });
});
