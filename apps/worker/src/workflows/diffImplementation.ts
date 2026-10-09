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

export async function diffImplementationWorkflow(input: {
  diffId: string;
}): Promise<{ status: string; commit?: string }> {
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
      await agentActivities.implementChange({
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

      if (review.valid) {
        const { head } = await gitActivities.releaseChange({
          repoDir: paths.repoDir,
          diffId: diff.diffId,
        });
        await gitActivities.updateDiffStatus({
          diffId: diff.diffId,
          status: 'implemented',
          commit: head,
        });
        return { status: 'implemented', commit: head };
      }

      if (review.refinedPlan) {
        plan = review.refinedPlan;
      }
    }

    await gitActivities.updateDiffStatus({ diffId: diff.diffId, status: 'failed' });
    return { status: 'failed' };
  } catch (error) {
    await gitActivities.updateDiffStatus({ diffId: input.diffId, status: 'failed' });
    throw error;
  }
}
