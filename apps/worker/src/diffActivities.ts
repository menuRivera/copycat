import { Client, Connection } from '@temporalio/client';
import { env } from '@copycat/core';
import { createServiceClient } from './lib/supabase';
import { runAgent } from './lib/agent';
import {
  commitAll,
  diffFromBase,
  mergeAndPush,
  prepareWorktree,
  runTests,
  truncate,
  type RepoPaths,
} from './lib/git';
import { askNoul, NOUL_YES_THRESHOLD } from './lib/typesafe';

export type DiffData = {
  diffId: string;
  projectId: string;
  projectName: string;
  repoUrl: string;
  title: string;
  description: string;
  instruction: string;
  status: string;
};

function requestBlock(diff: DiffData): string {
  return [
    `Title: ${diff.title}`,
    `Description: ${diff.description}`,
    `Instruction: ${diff.instruction}`,
  ].join('\n');
}

export async function getDiffData(input: { diffId: string }): Promise<DiffData> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('diffs')
    .select('id, project_id, title, description, instruction, status, projects ( name, repo_url )')
    .eq('id', input.diffId)
    .single();

  if (error || !data) {
    throw new Error(`diff not found: ${error?.message ?? input.diffId}`);
  }

  return {
    diffId: data.id,
    projectId: data.project_id,
    projectName: data.projects?.name ?? 'unknown',
    repoUrl: data.projects?.repo_url ?? '',
    title: data.title,
    description: data.description,
    instruction: data.instruction,
    status: data.status,
  };
}

let temporalClient: Client | null = null;

async function getTemporalClient(): Promise<Client> {
  if (!temporalClient) {
    const connection = await Connection.connect({ address: env.TEMPORAL_ADDRESS });
    temporalClient = new Client({ connection, namespace: env.TEMPORAL_NAMESPACE });
  }
  return temporalClient;
}

export async function isProjectBusy(input: {
  projectId: string;
  diffId: string;
}): Promise<boolean> {
  const client = await getTemporalClient();
  const { executions } = await client.workflowService.listWorkflowExecutions({
    namespace: env.TEMPORAL_NAMESPACE,
    query: "ExecutionStatus = 'Running' AND WorkflowType = 'diffImplementationWorkflow'",
    pageSize: 100,
  });

  const supabase = createServiceClient();
  for (const execution of executions ?? []) {
    const workflowId = execution.execution?.workflowId ?? '';
    const otherDiffId = workflowId.replace(/^diff-/, '');
    if (!otherDiffId || otherDiffId === input.diffId) {
      continue;
    }
    const { data } = await supabase
      .from('diffs')
      .select('project_id')
      .eq('id', otherDiffId)
      .maybeSingle();
    if (data?.project_id === input.projectId) {
      return true;
    }
  }

  return false;
}

export async function prepareDiffWorktree(input: {
  projectId: string;
  repoUrl: string;
  diffId: string;
}): Promise<RepoPaths> {
  return prepareWorktree(input.projectId, input.repoUrl, input.diffId);
}

export async function planChange(input: { worktreeDir: string; diff: DiffData }): Promise<string> {
  return runAgent({
    cwd: input.worktreeDir,
    allowedTools: ['Read', 'Glob', 'Grep'],
    maxTurns: 30,
    prompt: `You are planning a code change in this repository. Read the repository and produce a detailed, concrete implementation plan for the change request below. Do not modify any files.

Change request:
${requestBlock(input.diff)}`,
  });
}

export async function implementChange(input: {
  worktreeDir: string;
  diff: DiffData;
  plan: string;
  attempt: number;
}): Promise<{ commit: string | null }> {
  await runAgent({
    cwd: input.worktreeDir,
    allowedTools: ['Read', 'Edit', 'Write', 'Bash', 'Glob', 'Grep'],
    maxTurns: 80,
    prompt: `Implement the change request below in this repository. Follow the plan. Make all code changes, then stop: the harness commits your changes for you, do not run git commit.

Change request:
${requestBlock(input.diff)}

Plan:
${input.plan}`,
  });

  const commit = await commitAll(
    input.worktreeDir,
    `copycat: ${input.diff.title} (diff-${input.diff.diffId}, attempt ${input.attempt})`,
  );
  return { commit };
}

export async function reviewChange(input: {
  repoDir: string;
  worktreeDir: string;
  diff: DiffData;
}): Promise<{ valid: boolean; refinedPlan: string | null }> {
  const diffText = truncate(await diffFromBase(input.repoDir, input.worktreeDir), 20_000);
  const tests = await runTests(input.worktreeDir);

  const score = await askNoul(
    'Does this git diff fully and correctly implement the requested change, and do the tests pass when tests exist?',
    {
      request: {
        title: input.diff.title,
        description: input.diff.description,
        instruction: input.diff.instruction,
      },
      git_diff: diffText,
      tests: { ran: tests.ran, passed: tests.passed, output: tests.output },
    },
  );

  const valid = score > NOUL_YES_THRESHOLD && tests.passed;
  if (valid) {
    return { valid: true, refinedPlan: null };
  }

  const refinedPlan = await runAgent({
    cwd: input.worktreeDir,
    allowedTools: ['Read', 'Glob', 'Grep', 'Bash'],
    maxTurns: 30,
    prompt: `A previous implementation attempt for the change request below is not valid yet. Inspect the repository and the current changes, then produce a refined, concrete implementation plan to fix the issues. Do not modify files.

Change request:
${requestBlock(input.diff)}

Current git diff:
${diffText}

Test result:
${tests.output}`,
  });

  return { valid: false, refinedPlan };
}

export async function releaseChange(input: {
  repoDir: string;
  diffId: string;
}): Promise<{ head: string }> {
  const head = await mergeAndPush(input.repoDir, input.diffId);
  return { head };
}

export async function updateDiffStatus(input: {
  diffId: string;
  status: 'implemented' | 'failed';
  commit?: string;
}): Promise<void> {
  const supabase = createServiceClient();
  const patch: { status: 'implemented' | 'failed'; commit?: string } = { status: input.status };
  if (input.commit) {
    patch.commit = input.commit;
  }

  const { error } = await supabase.from('diffs').update(patch).eq('id', input.diffId);
  if (error) {
    throw new Error(`update diff failed: ${error.message}`);
  }
}
