import { describe, expect, it } from 'vitest';
import { domHash, normalizeWhitespace, sha256Hex } from './hash';

describe('sha256Hex', () => {
  it('is deterministic', () => {
    expect(sha256Hex('copycat')).toBe(sha256Hex('copycat'));
  });

  it('matches the known digest of an empty string', () => {
    expect(sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});

describe('normalizeWhitespace', () => {
  it('collapses runs of whitespace', () => {
    expect(normalizeWhitespace(' a \n\t b ')).toBe('a b');
  });
});

describe('domHash', () => {
  it('ignores whitespace differences', () => {
    expect(domHash('<div>  hello\n</div>')).toBe(domHash('<div> hello </div>'));
  });

  it('changes when content changes', () => {
    expect(domHash('<div>hello</div>')).not.toBe(domHash('<div>world</div>'));
  });
});
