import { z } from 'zod';

export const analyticStatementSchema = z.object({
  category: z.string().min(1).describe('Short category, e.g. conversion, ux, performance'),
  statement: z.string().min(1).describe('One specific, data-backed statement'),
  explanation: z.string().min(1).describe('Why it matters and what it suggests'),
});

export const analyticStatementListSchema = z.object({
  statements: z.array(analyticStatementSchema).describe('Only statements worth acting on'),
});

export type AnalyticStatement = z.infer<typeof analyticStatementSchema>;

export const analyticsEventSchema = z.object({
  event_type: z.enum(['page_view', 'click', 'noop_click', 'load_time', 'api_req']),
  page: z.string().max(500).default(''),
  section: z.string().max(200).default(''),
  element: z.string().max(200).default(''),
  duration_ms: z.number().min(0).max(600_000).default(0),
  x: z.number().min(0).max(100_000).optional(),
  y: z.number().min(0).max(100_000).optional(),
});

export const analyticsIngestSchema = z.object({
  token: z.string().min(16).max(128),
  events: z.array(analyticsEventSchema).min(1).max(500),
});

export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;
