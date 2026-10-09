import { describe, expect, it } from 'vitest';
import { parseGitHubRepo } from './github';

describe('parseGitHubRepo', () => {
  it('parses https github urls', () => {
    expect(parseGitHubRepo('https://github.com/acme/shop')).toEqual({ owner: 'acme', repo: 'shop' });
  });

  it('strips the .git suffix', () => {
    expect(parseGitHubRepo('https://github.com/acme/shop.git')).toEqual({
      owner: 'acme',
      repo: 'shop',
    });
  });

  it('returns null for non-github hosts', () => {
    expect(parseGitHubRepo('https://gitlab.com/acme/shop')).toBeNull();
  });

  it('returns null for invalid urls', () => {
    expect(parseGitHubRepo('not-a-url')).toBeNull();
    expect(parseGitHubRepo('https://github.com/acme')).toBeNull();
  });
});
