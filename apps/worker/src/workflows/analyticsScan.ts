import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../analyticsActivities';

const dbActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: { maximumAttempts: 2 },
});

const agentActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 minutes',
  retry: { maximumAttempts: 1 },
});

export async function analyticsScanWorkflow(): Promise<{
  projects: number;
  statements: number;
  diffsCreated: number;
}> {
  const projects = await dbActivities.getAnalyticsProjects();
  let statements = 0;
  let diffsCreated = 0;

  for (const project of projects) {
    try {
      const metrics = await dbActivities.retrieveMetrics({ projectId: project.projectId });
      if (metrics.length === 0) {
        continue;
      }

      const generated = await agentActivities.generateStatements({ metrics, project });
      statements += generated.length;

      for (const statement of generated) {
        if (!(await agentActivities.filterDiffWorthy({ statement }))) {
          continue;
        }
        const fields = await agentActivities.generateAnalyticDiff({ statement, project });
        await dbActivities.createAnalyticDiff({
          projectId: project.projectId,
          statement,
          fields,
        });
        diffsCreated += 1;
      }
    } catch {
      continue;
    }
  }

  return { projects: projects.length, statements, diffsCreated };
}
