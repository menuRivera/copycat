import path from 'node:path';
import { Worker, NativeConnection } from '@temporalio/worker';
import { createLogger, env, errorMessage } from '@copycat/core';
import * as activities from './activities';

const log = createLogger({ component: 'worker' });

export async function run(): Promise<void> {
  const connection = await NativeConnection.connect({ address: env.TEMPORAL_ADDRESS });
  const worker = await Worker.create({
    connection,
    namespace: env.TEMPORAL_NAMESPACE,
    taskQueue: env.TEMPORAL_TASK_QUEUE,
    workflowsPath: path.join(__dirname, 'workflows', 'index.ts'),
    activities,
  });
  await worker.run();
}

run().catch((error: unknown) => {
  log.error('worker crashed', { error: errorMessage(error) });
  process.exit(1);
});
