import { Connection, Client } from '@temporalio/client';
import { env } from '@copycat/core';

async function main(): Promise<void> {
  const connection = await Connection.connect({ address: env.TEMPORAL_ADDRESS });
  const client = new Client({ connection, namespace: env.TEMPORAL_NAMESPACE });

  const handle = await client.workflow.start('snapshotScanWorkflow', {
    taskQueue: env.TEMPORAL_TASK_QUEUE,
    workflowId: `snapshot-scan-manual-${Date.now()}`,
  });

  console.log(`started ${handle.workflowId}`);
  const result = await handle.result();
  console.log('result:', result);

  await connection.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
