import { generateObject } from 'ai';
import {
  analyticStatementListSchema,
  buildAnalyticDiffPrompt,
  buildStatementsPrompt,
  diffFieldsSchema,
  DIFF_WORTHY_QUESTION,
  type AnalyticStatement,
  type DiffFields,
  type StructuredMetric,
} from '@copycat/core';
import { createServiceClient } from './lib/supabase';
import { getModel } from './lib/model';
import { retrieveStructuredMetrics } from './lib/clickhouse';
import { askNoul, NOUL_YES_THRESHOLD } from './lib/typesafe';

export type AnalyticsProject = {
  projectId: string;
  name: string;
  repoUrl: string;
};

export async function getAnalyticsProjects(): Promise<AnalyticsProject[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, repo_url')
    .eq('active', true);

  if (error) {
    throw new Error(`list projects failed: ${error.message}`);
  }

  return (data ?? []).map((project) => ({
    projectId: project.id,
    name: project.name,
    repoUrl: project.repo_url,
  }));
}

export async function retrieveMetrics(input: {
  projectId: string;
}): Promise<StructuredMetric[]> {
  return retrieveStructuredMetrics(input.projectId);
}

export async function generateStatements(input: {
  metrics: StructuredMetric[];
  project: AnalyticsProject;
}): Promise<AnalyticStatement[]> {
  const { object } = await generateObject({
    model: getModel(),
    schema: analyticStatementListSchema,
    ...buildStatementsPrompt(input),
  });
  return object.statements;
}

export async function filterDiffWorthy(input: {
  statement: AnalyticStatement;
}): Promise<boolean> {
  const score = await askNoul(DIFF_WORTHY_QUESTION, input.statement);
  return score > NOUL_YES_THRESHOLD;
}

export async function generateAnalyticDiff(input: {
  statement: AnalyticStatement;
  project: AnalyticsProject;
}): Promise<DiffFields> {
  const { object } = await generateObject({
    model: getModel(),
    schema: diffFieldsSchema,
    ...buildAnalyticDiffPrompt(input),
  });
  return object;
}

export async function createAnalyticDiff(input: {
  projectId: string;
  statement: AnalyticStatement;
  fields: DiffFields;
}): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('diffs')
    .insert({
      project_id: input.projectId,
      competitor_id: null,
      type: 'analytic',
      title: input.fields.title,
      description: input.fields.description,
      instruction: input.fields.instruction,
      area: input.fields.area,
      impact: input.fields.impact,
      expected_outcome: input.fields.expected_outcome,
      statement: JSON.stringify(input.statement),
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`analytic diff insert failed: ${error?.message ?? 'no data'}`);
  }

  return data.id;
}
