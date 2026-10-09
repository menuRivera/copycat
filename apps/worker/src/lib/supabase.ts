import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, type Database } from '@copycat/core';

let client: SupabaseClient<Database> | null = null;

export function createServiceClient(): SupabaseClient<Database> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for the worker');
  }
  client ??= createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

const BUCKET = 'screenshots';

export async function uploadScreenshot(
  path: string,
  png: Buffer,
): Promise<{ bucketId: string; publicUrl: string }> {
  const supabase = createServiceClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, png, { contentType: 'image/png', upsert: true });
  if (error) {
    throw new Error(`screenshot upload failed: ${error.message}`);
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { bucketId: path, publicUrl: data.publicUrl };
}

export async function downloadScreenshot(path: string): Promise<Buffer> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) {
    throw new Error(`screenshot download failed: ${error?.message ?? 'not found'}`);
  }
  return Buffer.from(await data.arrayBuffer());
}
