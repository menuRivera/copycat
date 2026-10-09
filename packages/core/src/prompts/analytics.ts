import type { StructuredMetric } from '../analytics/metrics';
import type { AnalyticStatement } from '../schemas/analytics';
import type { PromptPair } from './types';

export type AnalyticsProjectRef = {
  name: string;
  repoUrl: string;
};

export function buildStatementsPrompt(input: {
  metrics: StructuredMetric[];
  project: AnalyticsProjectRef;
}): PromptPair {
  return {
    instructions:
      'You are a product analyst. Given month-over-month product metrics, produce at most 6 of the most insightful findings. Use only these categories: conversion, ux, performance, content. Each statement must cite the actual numbers from the metrics (metric name, this-month and previous-month values, direction and size of the change) and must never invent data. Prioritize signals that point to concrete product problems: no-op clicks on a section (broken or missing affordance), a drop in visit-to-click funnel conversion, falling clicks on key elements, and rising load or API times. The explanation says why it matters and what product change it suggests. Skip noise, tiny deltas and metrics that did not materially change.',
    prompt: [
      `Project: ${input.project.name}`,
      `Repository: ${input.project.repoUrl}`,
      'Metrics (thisMonth vs prevMonth):',
      JSON.stringify(input.metrics, null, 2),
    ].join('\n'),
  };
}

export function buildAnalyticDiffPrompt(input: {
  statement: AnalyticStatement;
  project: AnalyticsProjectRef;
}): PromptPair {
  return {
    instructions:
      "Turn this product-analytics finding into a proposed change for our own product. Write a short specific title, a human-readable description that repeats the finding's numbers and explains the change we propose, and a precise instruction for a coding agent working in our repository: reference the exact page, section or element involved, follow the existing stack and conventions from the repository, and keep the change scoped to this request. Classify the product area, judge the expected business impact (low, medium or high: how many users it reaches and how much it affects conversion or revenue), and state a measurable expected outcome, for example fewer no-op clicks on the section or higher visit-to-click conversion.",
    prompt: [
      `Project: ${input.project.name}`,
      `Repository: ${input.project.repoUrl}`,
      `Category: ${input.statement.category}`,
      `Statement: ${input.statement.statement}`,
      `Explanation: ${input.statement.explanation}`,
    ].join('\n'),
  };
}
