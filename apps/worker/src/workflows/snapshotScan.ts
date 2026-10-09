import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities';

const {
  listTargets,
  captureSnapshot,
  getPreviousSnapshot,
  generateDomDiffs,
  detectVisual,
  captureScreenshots,
  describeVisual,
  generateDiffFields,
  createDiff,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: { maximumAttempts: 3 },
});

const { checkReachable } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: { maximumAttempts: 1 },
});

export async function snapshotScanWorkflow(): Promise<{ scanned: number; diffsCreated: number }> {
  const targets = await listTargets();
  let scanned = 0;
  let diffsCreated = 0;

  for (const target of targets) {
    scanned += 1;
    try {
      if (!(await checkReachable({ url: target.competitorUrl }))) {
        continue;
      }

      const snapshot = await captureSnapshot({
        competitorId: target.competitorId,
        url: target.competitorUrl,
      });

      const previous = await getPreviousSnapshot({
        competitorId: target.competitorId,
        excludeSnapshotId: snapshot.snapshotId,
      });

      if (!previous || previous.domHash === snapshot.domHash) {
        continue;
      }

      const domDiffs = await generateDomDiffs({
        oldDom: previous.dom,
        newDom: snapshot.dom,
      });

      for (const [index, domDiff] of domDiffs.entries()) {
        const visual = await detectVisual({ domDiff });

        const screenshots = await captureScreenshots({
          competitorId: target.competitorId,
          competitorUrl: target.competitorUrl,
          oldSnapshotId: previous.snapshotId,
          newSnapshotId: snapshot.snapshotId,
          selector: domDiff.selector,
          diffIndex: index,
        });

        const visualDescription = visual
          ? await describeVisual({
              oldScreenshotId: screenshots.oldScreenshotId,
              newScreenshotId: screenshots.newScreenshotId,
            })
          : null;

        const fields = await generateDiffFields({
          domDiff,
          visualDescription,
          projectName: target.projectName,
          repoUrl: target.repoUrl,
        });

        await createDiff({
          projectId: target.projectId,
          competitorId: target.competitorId,
          oldScreenshotId: screenshots.oldScreenshotId,
          newScreenshotId: screenshots.newScreenshotId,
          title: fields.title,
          description: fields.description,
          instruction: fields.instruction,
        });

        diffsCreated += 1;
      }
    } catch {
      // Keep scanning the remaining competitors when one target fails.
      continue;
    }
  }

  return { scanned, diffsCreated };
}
