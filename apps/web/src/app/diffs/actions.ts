'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { WorkflowExecutionAlreadyStartedError } from '@temporalio/client';
import { env } from '@copycat/core';
import { createClient } from '@/lib/supabase/server';
import { getTemporalClient } from '@/lib/temporal';

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

export async function approveDiff(formData: FormData): Promise<void> {
  const diffId = String(formData.get('diff_id') ?? '');
  if (!diffId) {
    redirect('/diffs');
  }

  const updated = await setDiffStatus(diffId, 'approved');
  if (!updated) {
    redirect('/diffs');
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
      console.error('failed to start diffImplementationWorkflow', { diffId, error });
    }
  }

  revalidatePath('/diffs');
  revalidatePath('/');
}

export async function denyDiff(formData: FormData): Promise<void> {
  const diffId = String(formData.get('diff_id') ?? '');
  if (!diffId) {
    redirect('/diffs');
  }

  await setDiffStatus(diffId, 'denied');

  revalidatePath('/diffs');
  revalidatePath('/');
}
