import { Connection, Client, ScheduleOverlapPolicy } from '@temporalio/client';
import { env } from '@copycat/core';

async function main(): Promise<void> {
  const connection = await Connection.connect({ address: env.TEMPORAL_ADDRESS });
  const client = new Client({ connection, namespace: env.TEMPORAL_NAMESPACE });

  try {
    await client.schedule.getHandle('snapshot-scan-daily').describe();
    console.log('schedule snapshot-scan-daily already exists');
  } catch {
    await client.schedule.create({
      scheduleId: 'snapshot-scan-daily',
      spec: { cronExpressions: ['0 3 * * *'], timezone: 'UTC' },
      action: {
        type: 'startWorkflow',
        workflowType: 'snapshotScanWorkflow',
        taskQueue: env.TEMPORAL_TASK_QUEUE,
      },
      policies: { overlap: ScheduleOverlapPolicy.SKIP },
    });
    console.log('schedule snapshot-scan-daily registered (daily 03:00 UTC)');
  }

  await connection.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
