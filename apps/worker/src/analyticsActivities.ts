import { generateObject } from 'ai';
import {
  analyticStatementListSchema,
  diffFieldsSchema,
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
    instructions:
      'You are a product analyst. Given month-over-month product metrics, produce a short list of the most insightful, specific findings. Each statement has a category (conversion, ux, performance, content), a statement that cites the actual numbers, and an explanation of why it matters and what it suggests. Prefer findings that point to concrete product changes; ignore noise and tiny deltas.',
    prompt: [
      `Project: ${input.project.name}`,
      `Repository: ${input.project.repoUrl}`,
      'Metrics (thisMonth vs prevMonth):',
      JSON.stringify(input.metrics, null, 2),
    ].join('\n'),
  });
  return object.statements;
}

export async function filterDiffWorthy(input: {
  statement: AnalyticStatement;
}): Promise<boolean> {
  const score = await askNoul(
    'Is this analytics statement specific and actionable enough to justify a code change in our product?',
    input.statement,
  );
  return score > NOUL_YES_THRESHOLD;
}

export async function generateAnalyticDiff(input: {
  statement: AnalyticStatement;
  project: AnalyticsProject;
}): Promise<DiffFields> {
  const { object } = await generateObject({
    model: getModel(),
    schema: diffFieldsSchema,
    instructions:
      'Turn this product-analytics finding into a proposed change for our own product. Write a short title, a human-readable description explaining the finding and the proposed change, and a precise instruction for a coding agent working in our repository.',
    prompt: [
      `Project: ${input.project.name}`,
      `Repository: ${input.project.repoUrl}`,
      `Category: ${input.statement.category}`,
      `Statement: ${input.statement.statement}`,
      `Explanation: ${input.statement.explanation}`,
    ].join('\n'),
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
      statement: JSON.stringify(input.statement),
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`analytic diff insert failed: ${error?.message ?? 'no data'}`);
  }

  return data.id;
}
