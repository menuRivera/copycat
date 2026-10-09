import { domHash as hashDom, type DiffFields, type DomDiff } from '@copycat/core';
import {
  captureDom,
  isReachable,
  screenshotLiveSection,
  screenshotStoredDom,
} from './lib/capture';
import { createServiceClient, downloadScreenshot, uploadScreenshot } from './lib/supabase';
import {
  describeVisualDiff,
  generateDiffFields as generateDiffFieldsLlm,
  generateDomDiffs as generateDomDiffsLlm,
} from './lib/llm';
import { isVisualDiff } from './lib/typesafe';

export type Target = {
  projectId: string;
  projectName: string;
  repoUrl: string;
  competitorId: string;
  competitorUrl: string;
};

export type SnapshotRef = {
  snapshotId: string;
  domHash: string;
  dom: string;
};

export async function listTargets(): Promise<Target[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, repo_url, competitors!inner(id, url, active)')
    .eq('active', true)
    .eq('competitors.active', true);

  if (error) {
    throw new Error(`listTargets failed: ${error.message}`);
  }

  return (data ?? []).flatMap((project) =>
    project.competitors.map((competitor) => ({
      projectId: project.id,
      projectName: project.name,
      repoUrl: project.repo_url,
      competitorId: competitor.id,
      competitorUrl: competitor.url,
    })),
  );
}

export async function checkReachable(input: { url: string }): Promise<boolean> {
  return isReachable(input.url);
}

export async function captureSnapshot(input: {
  competitorId: string;
  url: string;
}): Promise<SnapshotRef> {
  const dom = await captureDom(input.url);
  const domHash = hashDom(dom);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('snapshots')
    .insert({ competitor_id: input.competitorId, dom_snapshot: dom, dom_hash: domHash })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`snapshot insert failed: ${error?.message ?? 'no data'}`);
  }

  return { snapshotId: data.id, domHash, dom };
}

export async function getPreviousSnapshot(input: {
  competitorId: string;
  excludeSnapshotId: string;
}): Promise<SnapshotRef | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('snapshots')
    .select('id, dom_hash, dom_snapshot')
    .eq('competitor_id', input.competitorId)
    .neq('id', input.excludeSnapshotId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`getPreviousSnapshot failed: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  return { snapshotId: data.id, domHash: data.dom_hash, dom: data.dom_snapshot };
}

export async function generateDomDiffs(input: {
  oldDom: string;
  newDom: string;
}): Promise<DomDiff[]> {
  return generateDomDiffsLlm(input.oldDom, input.newDom);
}

export async function detectVisual(input: { domDiff: DomDiff }): Promise<boolean> {
  return isVisualDiff(input.domDiff);
}

export async function captureScreenshots(input: {
  competitorId: string;
  competitorUrl: string;
  oldSnapshotId: string;
  newSnapshotId: string;
  selector: string;
  diffIndex: number;
}): Promise<{ oldScreenshotId: string; newScreenshotId: string }> {
  const supabase = createServiceClient();
  const { data: oldSnapshot, error } = await supabase
    .from('snapshots')
    .select('dom_snapshot')
    .eq('id', input.oldSnapshotId)
    .single();

  if (error || !oldSnapshot) {
    throw new Error(`old snapshot not found: ${error?.message ?? input.oldSnapshotId}`);
  }

  const [oldPng, newPng] = await Promise.all([
    screenshotStoredDom(oldSnapshot.dom_snapshot, input.selector),
    screenshotLiveSection(input.competitorUrl, input.selector),
  ]);

  const base = `${input.competitorId}/${input.newSnapshotId}/diff-${input.diffIndex}`;
  const oldPath = `${base}/old.png`;
  const newPath = `${base}/new.png`;
  const [oldUpload, newUpload] = await Promise.all([
    uploadScreenshot(oldPath, oldPng),
    uploadScreenshot(newPath, newPng),
  ]);

  await supabase.from('screenshots').delete().in('screenshot_bucket_id', [oldPath, newPath]);

  const { data, error: insertError } = await supabase
    .from('screenshots')
    .insert([
      {
        title: 'old',
        snapshot_id: input.oldSnapshotId,
        screenshot_bucket_id: oldUpload.bucketId,
        screenshot_public_url: oldUpload.publicUrl,
      },
      {
        title: 'new',
        snapshot_id: input.newSnapshotId,
        screenshot_bucket_id: newUpload.bucketId,
        screenshot_public_url: newUpload.publicUrl,
      },
    ])
    .select('id, title');

  if (insertError || !data) {
    throw new Error(`screenshot insert failed: ${insertError?.message ?? 'no data'}`);
  }

  const oldRow = data.find((row) => row.title === 'old');
  const newRow = data.find((row) => row.title === 'new');
  if (!oldRow || !newRow) {
    throw new Error('screenshot rows missing after insert');
  }

  return { oldScreenshotId: oldRow.id, newScreenshotId: newRow.id };
}

export async function describeVisual(input: {
  oldScreenshotId: string;
  newScreenshotId: string;
}): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('screenshots')
    .select('id, screenshot_bucket_id')
    .in('id', [input.oldScreenshotId, input.newScreenshotId]);

  if (error || !data) {
    throw new Error(`screenshots not found: ${error?.message ?? 'no data'}`);
  }

  const oldRow = data.find((row) => row.id === input.oldScreenshotId);
  const newRow = data.find((row) => row.id === input.newScreenshotId);
  if (!oldRow || !newRow) {
    throw new Error('screenshot rows missing for visual diff');
  }

  const [oldPng, newPng] = await Promise.all([
    downloadScreenshot(oldRow.screenshot_bucket_id),
    downloadScreenshot(newRow.screenshot_bucket_id),
  ]);

  return describeVisualDiff(oldPng, newPng);
}

export async function generateDiffFields(input: {
  domDiff: DomDiff;
  visualDescription: string | null;
  projectName: string;
  repoUrl: string;
}): Promise<DiffFields> {
  return generateDiffFieldsLlm(input);
}

export async function createDiff(input: {
  projectId: string;
  competitorId: string;
  oldScreenshotId: string;
  newScreenshotId: string;
  title: string;
  description: string;
  instruction: string;
}): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('diffs')
    .insert({
      project_id: input.projectId,
      competitor_id: input.competitorId,
      type: 'snapshot',
      old_screenshot_id: input.oldScreenshotId,
      new_screenshot_id: input.newScreenshotId,
      title: input.title,
      description: input.description,
      instruction: input.instruction,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`diff insert failed: ${error?.message ?? 'no data'}`);
  }

  return data.id;
}
