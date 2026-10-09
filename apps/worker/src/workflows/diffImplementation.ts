import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from '../diffActivities';

const gitActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: { maximumAttempts: 2 },
});

const agentActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 minutes',
  retry: { maximumAttempts: 1 },
});

const MAX_REVIEW_ROUNDS = 3;
const MAX_VALIDATION_ATTEMPTS = 20;

type ValidationOutcome = {
  status: 'passed' | 'failed' | 'skipped';
  summary: string;
  notes: string;
};

async function runValidation(diffId: string): Promise<ValidationOutcome> {
  for (let attempt = 1; attempt <= MAX_VALIDATION_ATTEMPTS; attempt++) {
    const resolved = await agentActivities.resolveValidationUrl({
      diffId,
      allowDeploymentFallback: attempt === MAX_VALIDATION_ATTEMPTS,
    });

    if (resolved.kind === 'url') {
      const result = await agentActivities.validateChange({ diffId, url: resolved.url });
      return { status: result.status, summary: result.summary, notes: result.notes };
    }

    if (resolved.kind === 'none') {
      return {
        status: 'skipped',
        summary: 'validation skipped',
        notes: JSON.stringify({ reason: resolved.reason }),
      };
    }

    if (attempt === MAX_VALIDATION_ATTEMPTS) {
      break;
    }
    await sleep('15 seconds');
  }

  return {
    status: 'skipped',
    summary: 'validation skipped',
    notes: JSON.stringify({ reason: 'no preview url appeared within the timeout' }),
  };
}

export async function diffImplementationWorkflow(input: {
  diffId: string;
}): Promise<{ status: string; commit?: string; prUrl?: string }> {
  try {
    const diff = await gitActivities.getDiffData({ diffId: input.diffId });
    if (diff.status !== 'approved') {
      return { status: 'skipped' };
    }

    while (await gitActivities.isProjectBusy({ projectId: diff.projectId, diffId: diff.diffId })) {
      await sleep('30 seconds');
    }

    const paths = await gitActivities.prepareDiffWorktree({
      projectId: diff.projectId,
      repoUrl: diff.repoUrl,
      diffId: diff.diffId,
    });

    let plan = await agentActivities.planChange({ worktreeDir: paths.worktreeDir, diff });

    for (let round = 1; round <= MAX_REVIEW_ROUNDS; round++) {
      const implemented = await agentActivities.implementChange({
        worktreeDir: paths.worktreeDir,
        diff,
        plan,
        attempt: round,
      });

      const review = await agentActivities.reviewChange({
        repoDir: paths.repoDir,
        worktreeDir: paths.worktreeDir,
        diff,
      });

      if (!review.valid) {
        if (review.refinedPlan) {
          plan = review.refinedPlan;
        }
        continue;
      }

      const commit = implemented.commit ?? undefined;
      const base = await gitActivities.getDefaultBranch({ repoDir: paths.repoDir });

      await gitActivities.pushDiffBranch({ repoDir: paths.repoDir, diffId: diff.diffId });
      const pr = await agentActivities.openPullRequestForDiff({ diff, base });
      const validation = await runValidation(diff.diffId);

      if (validation.status === 'failed') {
        await gitActivities.updateDiffValidation({
          diffId: diff.diffId,
          validationStatus: 'failed',
          notes: validation.notes,
          prUrl: pr.status === 'created' ? pr.url : undefined,
        });
        await gitActivities.updateDiffStatus({ diffId: diff.diffId, status: 'failed' });
        return { status: 'failed' };
      }

      if (pr.status === 'created') {
        await gitActivities.updateDiffValidation({
          diffId: diff.diffId,
          validationStatus: validation.status,
          notes: validation.notes,
          prUrl: pr.url,
        });
        await gitActivities.updateDiffStatus({
          diffId: diff.diffId,
          status: 'pr_open',
          commit,
        });
        return { status: 'pr_open', commit, prUrl: pr.url };
      }

      const { head } = await gitActivities.releaseChange({
        repoDir: paths.repoDir,
        diffId: diff.diffId,
      });
      await gitActivities.updateDiffValidation({
        diffId: diff.diffId,
        validationStatus: validation.status,
        notes: validation.notes,
      });
      await gitActivities.updateDiffStatus({
        diffId: diff.diffId,
        status: 'implemented',
        commit: head,
      });
      return { status: 'implemented', commit: head };
    }

    await gitActivities.updateDiffStatus({ diffId: diff.diffId, status: 'failed' });
    return { status: 'failed' };
  } catch (error) {
    await gitActivities.updateDiffStatus({ diffId: input.diffId, status: 'failed' });
    throw error;
  }
}
