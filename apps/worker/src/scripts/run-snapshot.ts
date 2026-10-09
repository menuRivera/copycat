import { Connection, Client } from '@temporalio/client';
import { env } from '@copycat/core';

type Mode = 'changes' | 'gap' | 'init';

async function main(): Promise<void> {
  const mode = process.argv[2] as Mode | undefined;
  const projectId = process.argv[3];

  const connection = await Connection.connect({ address: env.TEMPORAL_ADDRESS });
  const client = new Client({ connection, namespace: env.TEMPORAL_NAMESPACE });

  const handle = await client.workflow.start('snapshotScanWorkflow', {
    taskQueue: env.TEMPORAL_TASK_QUEUE,
    workflowId: `snapshot-scan-manual-${Date.now()}`,
    args: [
      {
        ...(mode ? { mode } : {}),
        ...(projectId ? { projectIds: [projectId] } : {}),
      },
    ],
  });

  console.log(`started ${handle.workflowId} (mode: ${mode ?? 'changes'})`);
  const result = await handle.result();
  console.log('result:', result);

  await connection.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
