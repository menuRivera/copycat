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
