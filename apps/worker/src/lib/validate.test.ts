import { describe, expect, it } from 'vitest';
import { evaluateBrowserValidation } from './validate';

const base = { httpStatus: 200, pageErrors: [], consoleErrors: [] };

describe('evaluateBrowserValidation', () => {
  it('passes a clean page', () => {
    expect(evaluateBrowserValidation(base)).toBe('passed');
  });

  it('passes with up to five console errors', () => {
    expect(
      evaluateBrowserValidation({
        ...base,
        consoleErrors: ['a', 'b', 'c', 'd', 'e'],
      }),
    ).toBe('passed');
  });

  it('fails on http errors', () => {
    expect(evaluateBrowserValidation({ ...base, httpStatus: 404 })).toBe('failed');
    expect(evaluateBrowserValidation({ ...base, httpStatus: 0 })).toBe('failed');
  });

  it('fails on any page error', () => {
    expect(evaluateBrowserValidation({ ...base, pageErrors: ['boom'] })).toBe('failed');
  });

  it('fails above five console errors', () => {
    expect(
      evaluateBrowserValidation({
        ...base,
        consoleErrors: ['a', 'b', 'c', 'd', 'e', 'f'],
      }),
    ).toBe('failed');
  });
});
