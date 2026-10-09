import { domHash as hashDom } from '@copycat/core';
import { captureDom, screenshotLiveSection } from './lib/capture';
import { createServiceClient, uploadScreenshot } from './lib/supabase';
import type { SnapshotRef } from './activities';

export async function captureOwnSnapshot(input: {
  projectId: string;
  url: string;
}): Promise<SnapshotRef> {
  const dom = await captureDom(input.url);
  const domHash = hashDom(dom);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('snapshots')
    .insert({
      project_id: input.projectId,
      competitor_id: null,
      kind: 'own',
      dom_snapshot: dom,
      dom_hash: domHash,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`own snapshot insert failed: ${error?.message ?? 'no data'}`);
  }

  return { snapshotId: data.id, domHash, dom };
}

export async function captureNewScreenshot(input: {
  competitorId: string;
  snapshotId: string;
  url: string;
}): Promise<string> {
  const png = await screenshotLiveSection(input.url, 'body');
  const path = `${input.competitorId}/${input.snapshotId}/init/new.png`;
  const upload = await uploadScreenshot(path, png);

  const supabase = createServiceClient();
  await supabase.from('screenshots').delete().in('screenshot_bucket_id', [path]);

  const { data, error } = await supabase
    .from('screenshots')
    .insert({
      title: 'new',
      snapshot_id: input.snapshotId,
      screenshot_bucket_id: upload.bucketId,
      screenshot_public_url: upload.publicUrl,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`screenshot insert failed: ${error?.message ?? 'no data'}`);
  }

  return data.id;
}

export async function createInitDiff(input: {
  projectId: string;
  competitorId: string;
  newScreenshotId: string;
  title: string;
  description: string;
  instruction: string;
  area: string;
  impact: 'low' | 'medium' | 'high';
  expectedOutcome: string;
}): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('diffs')
    .insert({
      project_id: input.projectId,
      competitor_id: input.competitorId,
      type: 'init',
      new_screenshot_id: input.newScreenshotId,
      title: input.title,
      description: input.description,
      instruction: input.instruction,
      area: input.area,
      impact: input.impact,
      expected_outcome: input.expectedOutcome,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`init diff insert failed: ${error?.message ?? 'no data'}`);
  }

  return data.id;
}
