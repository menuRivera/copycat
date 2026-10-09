import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '@copycat/core';

const exec = promisify(execFile);

export type RepoPaths = { repoDir: string; worktreeDir: string };

function workspaceRoot(): string {
  return env.WORKSPACE_DIR ?? path.resolve(process.cwd(), '../..', 'workspace');
}

export function repoDirFor(projectId: string): string {
  return path.join(workspaceRoot(), projectId, 'repo');
}

export function worktreeDirFor(projectId: string, diffId: string): string {
  return path.join(workspaceRoot(), projectId, 'worktrees', `diff-${diffId}`);
}

function authedUrl(repoUrl: string): string {
  if (!env.GITHUB_TOKEN) {
    return repoUrl;
  }
  try {
    const url = new URL(repoUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return repoUrl;
    }
    url.username = 'x-access-token';
    url.password = env.GITHUB_TOKEN;
    return url.toString();
  } catch {
    return repoUrl;
  }
}

function sanitize(message: string): string {
  const token = env.GITHUB_TOKEN;
  return token ? message.split(token).join('***') : message;
}

async function git(args: string[], cwd?: string): Promise<string> {
  try {
    const { stdout } = await exec('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 });
    return stdout.trim();
  } catch (error) {
    const failure = error as { stderr?: string; message: string };
    throw new Error(`git ${args[0]} failed: ${sanitize(failure.stderr ?? failure.message)}`);
  }
}

export async function defaultBranch(repoDir: string): Promise<string> {
  const head = await git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], repoDir).catch(
    () => '',
  );
  if (head.startsWith('origin/')) {
    return head.slice('origin/'.length);
  }

  const remoteHead = await git(['ls-remote', '--symref', 'origin', 'HEAD'], repoDir).catch(
    () => '',
  );
  const match = remoteHead.match(/ref:\s+refs\/heads\/(\S+)\s+HEAD/);
  if (match?.[1]) {
    return match[1];
  }

  throw new Error('repository has no commits (empty remote)');
}

export async function prepareWorktree(
  projectId: string,
  repoUrl: string,
  diffId: string,
): Promise<RepoPaths> {
  const repoDir = repoDirFor(projectId);
  const worktreeDir = worktreeDirFor(projectId, diffId);
  await mkdir(path.dirname(repoDir), { recursive: true });

  const hasRepo = await git(['rev-parse', '--git-dir'], repoDir)
    .then(() => true)
    .catch(() => false);

  if (!hasRepo) {
    await git(['clone', authedUrl(repoUrl), repoDir]);
    await git(['config', 'user.name', 'Copycat Agent'], repoDir);
    await git(['config', 'user.email', 'agent@copycat.local'], repoDir);
  } else {
    await git(['fetch', '--prune', 'origin'], repoDir);
  }

  const base = await defaultBranch(repoDir);
  await git(['worktree', 'remove', '--force', worktreeDir], repoDir).catch(() => undefined);
  await git(['worktree', 'add', '-B', `diff-${diffId}`, worktreeDir, `origin/${base}`], repoDir);

  return { repoDir, worktreeDir };
}

export async function commitAll(worktreeDir: string, message: string): Promise<string | null> {
  await git(['add', '-A'], worktreeDir);
  const status = await git(['status', '--porcelain'], worktreeDir);
  if (!status) {
    return null;
  }
  await git(['commit', '-m', message], worktreeDir);
  return git(['rev-parse', 'HEAD'], worktreeDir);
}

export async function diffFromBase(repoDir: string, worktreeDir: string): Promise<string> {
  const base = await defaultBranch(repoDir);
  return git(['diff', `origin/${base}...HEAD`], worktreeDir);
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}\n<!-- truncated -->`;
}

export async function runTests(
  worktreeDir: string,
): Promise<{ ran: boolean; passed: boolean; output: string }> {
  const packageJsonPath = path.join(worktreeDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return { ran: false, passed: true, output: 'no package.json' };
  }

  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
    scripts?: Record<string, string>;
  };
  if (!packageJson.scripts?.test) {
    return { ran: false, passed: true, output: 'no test script' };
  }

  try {
    const { stdout, stderr } = await exec('npm', ['test', '--silent'], {
      cwd: worktreeDir,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 5 * 60 * 1000,
    });
    return { ran: true, passed: true, output: truncate(`${stdout}${stderr}`, 4000) };
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; message: string };
    return {
      ran: true,
      passed: false,
      output: truncate(`${failure.stdout ?? ''}${failure.stderr ?? ''}${failure.message}`, 4000),
    };
  }
}

export async function pushDiffBranch(repoDir: string, diffId: string): Promise<void> {
  await git(
    ['push', '--force-with-lease', 'origin', `diff-${diffId}:diff-${diffId}`],
    repoDir,
  );
}

export async function mergeAndPush(repoDir: string, diffId: string): Promise<string> {
  const base = await defaultBranch(repoDir);
  await git(['checkout', base], repoDir);
  await git(['reset', '--hard', `origin/${base}`], repoDir);
  await git(['merge', '--no-ff', `diff-${diffId}`, '-m', `Merge diff-${diffId}`], repoDir);
  await git(['push', 'origin', base], repoDir);
  return git(['rev-parse', 'HEAD'], repoDir);
}
