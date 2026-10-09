import { z } from 'zod';

export const httpUrlSchema = z.string().trim().refine(
  (value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  },
  { message: 'Must be an absolute http(s) URL' },
);

export const competitorInputSchema = z.object({
  name: z.string().trim().max(100).optional(),
  url: httpUrlSchema,
});

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  repo_url: httpUrlSchema,
  deployment_url: z
    .union([httpUrlSchema, z.literal('')])
    .optional()
    .transform((value) => (value === '' || value === undefined ? undefined : value)),
  competitors: z.array(competitorInputSchema).min(1, 'At least one competitor URL is required'),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type CompetitorInput = z.infer<typeof competitorInputSchema>;
