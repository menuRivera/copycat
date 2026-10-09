'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { WorkflowExecutionAlreadyStartedError } from '@temporalio/client';
import { createLogger, env, errorMessage } from '@copycat/core';
import { createClient } from '@/lib/supabase/server';
import { getTemporalClient } from '@/lib/temporal';

const log = createLogger({ component: 'web' });

async function setDiffStatus(diffId: string, status: 'approved' | 'denied'): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('diffs')
    .update({ status })
    .eq('id', diffId)
    .eq('status', 'created')
    .select('id');

  if (error || !data || data.length === 0) {
    return false;
  }
  return true;
}

function projectPath(projectId: string): string {
  return `/projects/${projectId}`;
}

export async function approveDiff(formData: FormData): Promise<void> {
  const diffId = String(formData.get('diff_id') ?? '');
  const projectId = String(formData.get('project_id') ?? '');
  if (!diffId || !projectId) {
    redirect('/');
  }

  const updated = await setDiffStatus(diffId, 'approved');
  if (!updated) {
    redirect(projectPath(projectId));
  }

  try {
    const client = await getTemporalClient();
    await client.workflow.start('diffImplementationWorkflow', {
      taskQueue: env.TEMPORAL_TASK_QUEUE,
      workflowId: `diff-${diffId}`,
      args: [{ diffId }],
      workflowIdReusePolicy: 'ALLOW_DUPLICATE',
    });
  } catch (error) {
    if (!(error instanceof WorkflowExecutionAlreadyStartedError)) {
      log.error('failed to start diffImplementationWorkflow', {
        diffId,
        error: errorMessage(error),
      });
    }
  }

  revalidatePath(projectPath(projectId));
  revalidatePath('/');
}

export async function denyDiff(formData: FormData): Promise<void> {
  const diffId = String(formData.get('diff_id') ?? '');
  const projectId = String(formData.get('project_id') ?? '');
  if (!diffId || !projectId) {
    redirect('/');
  }

  await setDiffStatus(diffId, 'denied');

  revalidatePath(projectPath(projectId));
  revalidatePath('/');
}
