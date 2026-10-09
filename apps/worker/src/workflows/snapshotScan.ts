import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities';
import type { Target } from '../activities';

const dbActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: { maximumAttempts: 3 },
});

const agentActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 minutes',
  retry: { maximumAttempts: 1 },
});

const { checkReachable } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: { maximumAttempts: 1 },
});

export type SnapshotScanMode = 'changes' | 'gap' | 'init';

async function runChanges(target: Target): Promise<number> {
  const snapshot = await dbActivities.captureSnapshot({
    projectId: target.projectId,
    competitorId: target.competitorId,
    url: target.competitorUrl,
  });

  const previous = await dbActivities.getPreviousSnapshot({
    competitorId: target.competitorId,
    excludeSnapshotId: snapshot.snapshotId,
  });

  if (!previous || previous.domHash === snapshot.domHash) {
    return 0;
  }

  const domDiffs = await agentActivities.generateDomDiffs({
    oldDom: previous.dom,
    newDom: snapshot.dom,
  });

  let created = 0;
  for (const [index, domDiff] of domDiffs.entries()) {
    const visual = await agentActivities.detectVisual({ domDiff });

    const screenshots = await dbActivities.captureScreenshots({
      competitorId: target.competitorId,
      competitorUrl: target.competitorUrl,
      oldSnapshotId: previous.snapshotId,
      newSnapshotId: snapshot.snapshotId,
      selector: domDiff.selector,
      diffIndex: index,
    });

    const visualDescription = visual
      ? await agentActivities.describeVisual({
          oldScreenshotId: screenshots.oldScreenshotId,
          newScreenshotId: screenshots.newScreenshotId,
        })
      : null;

    const fields = await agentActivities.generateDiffFields({
      domDiff,
      visualDescription,
      projectName: target.projectName,
      repoUrl: target.repoUrl,
    });

    await dbActivities.createDiff({
      projectId: target.projectId,
      competitorId: target.competitorId,
      oldScreenshotId: screenshots.oldScreenshotId,
      newScreenshotId: screenshots.newScreenshotId,
      title: fields.title,
      description: fields.description,
      instruction: fields.instruction,
    });

    created += 1;
  }

  return created;
}

async function runGap(target: Target): Promise<number> {
  if (!target.deploymentUrl) {
    return 0;
  }
  if (!(await checkReachable({ url: target.deploymentUrl }))) {
    return 0;
  }

  const competitorSnapshot = await dbActivities.captureSnapshot({
    projectId: target.projectId,
    competitorId: target.competitorId,
    url: target.competitorUrl,
  });
  const ownSnapshot = await dbActivities.captureOwnSnapshot({
    projectId: target.projectId,
    url: target.deploymentUrl,
  });

  const gaps = await agentActivities.generateGapDiffs({
    ownDom: ownSnapshot.dom,
    competitorDom: competitorSnapshot.dom,
    projectName: target.projectName,
    repoUrl: target.repoUrl,
    competitorName: target.competitorName,
  });

  let created = 0;
  for (const [index, gap] of gaps.entries()) {
    const visual = await agentActivities.detectVisual({ domDiff: gap });

    const screenshots = await dbActivities.captureScreenshots({
      competitorId: target.competitorId,
      competitorUrl: target.competitorUrl,
      oldSnapshotId: ownSnapshot.snapshotId,
      newSnapshotId: competitorSnapshot.snapshotId,
      selector: gap.selector,
      diffIndex: index,
    });

    const visualDescription = visual
      ? await agentActivities.describeVisual({
          oldScreenshotId: screenshots.oldScreenshotId,
          newScreenshotId: screenshots.newScreenshotId,
        })
      : null;

    const fields = await agentActivities.generateDiffFields({
      domDiff: gap,
      visualDescription,
      projectName: target.projectName,
      repoUrl: target.repoUrl,
    });

    await dbActivities.createDiff({
      projectId: target.projectId,
      competitorId: target.competitorId,
      oldScreenshotId: screenshots.oldScreenshotId,
      newScreenshotId: screenshots.newScreenshotId,
      title: fields.title,
      description: fields.description,
      instruction: fields.instruction,
    });

    created += 1;
  }

  return created;
}

async function runInit(target: Target): Promise<number> {
  const snapshot = await dbActivities.captureSnapshot({
    projectId: target.projectId,
    competitorId: target.competitorId,
    url: target.competitorUrl,
  });

  const fields = await agentActivities.generateInitFields({
    projectName: target.projectName,
    repoUrl: target.repoUrl,
    competitorName: target.competitorName,
    competitorUrl: target.competitorUrl,
    competitorDom: snapshot.dom,
  });

  const newScreenshotId = await dbActivities.captureNewScreenshot({
    competitorId: target.competitorId,
    snapshotId: snapshot.snapshotId,
    url: target.competitorUrl,
  });

  await dbActivities.createInitDiff({
    projectId: target.projectId,
    competitorId: target.competitorId,
    newScreenshotId,
    title: fields.title,
    description: fields.description,
    instruction: fields.instruction,
  });

  return 1;
}

export async function snapshotScanWorkflow(
  input: { projectIds?: string[]; mode?: SnapshotScanMode } = {},
): Promise<{ scanned: number; diffsCreated: number }> {
  const mode = input.mode ?? 'changes';
  const targets = await dbActivities.listTargets(
    input.projectIds && input.projectIds.length > 0 ? { projectIds: input.projectIds } : {},
  );

  let scanned = 0;
  let diffsCreated = 0;

  for (const target of targets) {
    scanned += 1;
    try {
      if (!(await checkReachable({ url: target.competitorUrl }))) {
        continue;
      }

      if (mode === 'init') {
        diffsCreated += await runInit(target);
      } else if (mode === 'gap') {
        diffsCreated += await runGap(target);
      } else {
        diffsCreated += await runChanges(target);
      }
    } catch {
      // Keep scanning the remaining competitors when one target fails.
      continue;
    }
  }

  return { scanned, diffsCreated };
}
