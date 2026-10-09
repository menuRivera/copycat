'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { projectCreateSchema } from '@copycat/core';
import { createClient } from '@/lib/supabase/server';
import type { ProjectFormState } from './project-form-state';

function firstMessages(fieldErrors: Record<string, string[] | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    const [first] = messages ?? [];
    if (first) {
      result[key] = first;
    }
  }
  return result;
}

export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const competitorUrls = formData.getAll('competitor_url').map(String);
  const competitorNames = formData.getAll('competitor_name').map(String);

  const parsed = projectCreateSchema.safeParse({
    name: String(formData.get('name') ?? ''),
    repo_url: String(formData.get('repo_url') ?? ''),
    deployment_url: String(formData.get('deployment_url') ?? ''),
    competitors: competitorUrls.map((url, index) => ({
      url,
      name: competitorNames[index] ?? '',
    })),
  });

  if (!parsed.success) {
    return { fieldErrors: firstMessages(z.flattenError(parsed.error).fieldErrors) };
  }

  const input = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { fieldErrors: {}, formError: 'You must be signed in.' };
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      name: input.name,
      repo_url: input.repo_url,
      deployment_url: input.deployment_url ?? null,
    })
    .select('id')
    .single();

  if (projectError || !project) {
    return { fieldErrors: {}, formError: projectError?.message ?? 'Could not create the project.' };
  }

  const competitorRows = input.competitors.map((competitor) => ({
    project_id: project.id,
    name: competitor.name && competitor.name.length > 0 ? competitor.name : new URL(competitor.url).hostname,
    url: competitor.url,
  }));

  const { error: competitorsError } = await supabase.from('competitors').insert(competitorRows);

  if (competitorsError) {
    await supabase.from('projects').delete().eq('id', project.id);
    return { fieldErrors: {}, formError: competitorsError.message };
  }

  revalidatePath('/');
  redirect('/');
}
