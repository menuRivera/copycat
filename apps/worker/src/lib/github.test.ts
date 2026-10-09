import { afterEach, describe, expect, it, vi } from 'vitest';
import { findDeploymentPreviewUrl, parseGitHubRepo } from './github';

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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('findDeploymentPreviewUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the environment url of a successful deployment', async () => {
    const fetchMock = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.includes('/deployments?')) {
        return jsonResponse([{ id: 1 }]);
      }
      if (url.includes('/deployments/1/statuses')) {
        return jsonResponse([{ state: 'success', environment_url: 'https://preview.example.com' }]);
      }
      return jsonResponse({}, 404);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      findDeploymentPreviewUrl({ repoUrl: 'https://github.com/acme/shop', branch: 'diff-1' }),
    ).resolves.toEqual({ kind: 'url', url: 'https://preview.example.com' });
  });

  it('returns pending while no successful deployment exists', async () => {
    const fetchMock = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.includes('/deployments?')) {
        return jsonResponse([{ id: 7 }]);
      }
      return jsonResponse([{ state: 'in_progress' }]);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      findDeploymentPreviewUrl({ repoUrl: 'https://github.com/acme/shop', branch: 'diff-1' }),
    ).resolves.toEqual({ kind: 'pending' });
  });

  it('returns none when the api rejects the token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ message: 'forbidden' }, 403)),
    );

    const result = await findDeploymentPreviewUrl({
      repoUrl: 'https://github.com/acme/shop',
      branch: 'diff-1',
    });
    expect(result.kind).toBe('none');
  });

  it('returns none for non-github remotes without fetching', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      findDeploymentPreviewUrl({ repoUrl: 'https://gitlab.com/acme/shop', branch: 'diff-1' }),
    ).resolves.toEqual({ kind: 'none', reason: expect.any(String) });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
