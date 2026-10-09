import { env } from '@copycat/core';

const API = 'https://api.github.com';

export type RepoRef = { owner: string; repo: string };

export function parseGitHubRepo(repoUrl: string): RepoRef | null {
  try {
    const url = new URL(repoUrl);
    if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') {
      return null;
    }
    const [owner, repoSegment] = url.pathname.replace(/^\/+/, '').split('/');
    if (!owner || !repoSegment) {
      return null;
    }
    return { owner, repo: repoSegment.replace(/\.git$/, '') };
  } catch {
    return null;
  }
}

export type PullRequestResult =
  | { status: 'created'; url: string; number: number }
  | { status: 'skipped'; reason: string };

async function githubFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'x-github-api-version': '2022-11-28',
      ...init?.headers,
    },
  });
}

export async function openPullRequest(input: {
  repoUrl: string;
  head: string;
  base: string;
  title: string;
  body: string;
}): Promise<PullRequestResult> {
  const ref = parseGitHubRepo(input.repoUrl);
  if (!ref) {
    return { status: 'skipped', reason: 'repository is not hosted on github.com' };
  }
  if (!env.GITHUB_TOKEN) {
    return { status: 'skipped', reason: 'GITHUB_TOKEN is not configured' };
  }

  const response = await githubFetch(`/repos/${ref.owner}/${ref.repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title: input.title,
      body: input.body,
      head: input.head,
      base: input.base,
    }),
  });

  if (response.status === 201) {
    const pr = (await response.json()) as { html_url: string; number: number };
    return { status: 'created', url: pr.html_url, number: pr.number };
  }

  if (response.status === 422) {
    const existing = await githubFetch(
      `/repos/${ref.owner}/${ref.repo}/pulls?head=${ref.owner}:${input.head}&state=open`,
    );
    if (existing.ok) {
      const prs = (await existing.json()) as { html_url: string; number: number }[];
      const [pr] = prs;
      if (pr) {
        return { status: 'created', url: pr.html_url, number: pr.number };
      }
    }
  }

  const detail = await response.text();
  throw new Error(`github pull request failed (${response.status}): ${detail.slice(0, 500)}`);
}

export type PreviewUrlResult =
  | { kind: 'url'; url: string }
  | { kind: 'pending' }
  | { kind: 'none'; reason: string };

export async function findDeploymentPreviewUrl(input: {
  repoUrl: string;
  branch: string;
}): Promise<PreviewUrlResult> {
  const ref = parseGitHubRepo(input.repoUrl);
  if (!ref || !env.GITHUB_TOKEN) {
    return { kind: 'none', reason: 'github previews unavailable (no token or non-github host)' };
  }

  const deploymentsResponse = await githubFetch(
    `/repos/${ref.owner}/${ref.repo}/deployments?ref=${encodeURIComponent(input.branch)}&per_page=10`,
  );
  if (deploymentsResponse.status === 404 || deploymentsResponse.status === 403) {
    return { kind: 'none', reason: `github deployments unavailable (${deploymentsResponse.status})` };
  }
  if (!deploymentsResponse.ok) {
    return { kind: 'pending' };
  }

  const deployments = (await deploymentsResponse.json()) as { id: number }[];
  for (const deployment of deployments) {
    const statusesResponse = await githubFetch(
      `/repos/${ref.owner}/${ref.repo}/deployments/${deployment.id}/statuses`,
    );
    if (!statusesResponse.ok) {
      continue;
    }
    const statuses = (await statusesResponse.json()) as {
      environment_url?: string;
      state?: string;
    }[];
    const ready = statuses.find((status) => status.environment_url && status.state === 'success');
    if (ready?.environment_url) {
      return { kind: 'url', url: ready.environment_url };
    }
  }

  return { kind: 'pending' };
}
