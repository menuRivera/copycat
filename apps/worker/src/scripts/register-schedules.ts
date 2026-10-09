import { Connection, Client, ScheduleOverlapPolicy } from '@temporalio/client';
import { env } from '@copycat/core';

const schedules = [
  {
    scheduleId: 'snapshot-scan-daily',
    cron: '0 3 * * *',
    workflowType: 'snapshotScanWorkflow',
    label: 'daily 03:00 UTC',
  },
  {
    scheduleId: 'analytics-scan-monthly',
    cron: '0 3 1 * *',
    workflowType: 'analyticsScanWorkflow',
    label: 'monthly, 1st at 03:00 UTC',
  },
];

async function main(): Promise<void> {
  const connection = await Connection.connect({ address: env.TEMPORAL_ADDRESS });
  const client = new Client({ connection, namespace: env.TEMPORAL_NAMESPACE });

  for (const schedule of schedules) {
    try {
      await client.schedule.getHandle(schedule.scheduleId).describe();
      console.log(`schedule ${schedule.scheduleId} already exists`);
    } catch {
      await client.schedule.create({
        scheduleId: schedule.scheduleId,
        spec: { cronExpressions: [schedule.cron], timezone: 'UTC' },
        action: {
          type: 'startWorkflow',
          workflowType: schedule.workflowType,
          taskQueue: env.TEMPORAL_TASK_QUEUE,
        },
        policies: { overlap: ScheduleOverlapPolicy.SKIP },
      });
      console.log(`schedule ${schedule.scheduleId} registered (${schedule.label})`);
    }
  }

  await connection.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
