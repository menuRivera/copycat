import { z } from 'zod';

export const domDiffSchema = z.object({
  selector: z.string().min(1).describe('CSS selector of the changed section'),
  summary: z.string().min(1).describe('One-sentence summary of the change'),
  old_text: z.string().describe('Relevant text from the old DOM'),
  new_text: z.string().describe('Relevant text from the new DOM'),
});

export const domDiffListSchema = z.object({
  diffs: z.array(domDiffSchema).describe('Only the relevant changes; empty when none matter'),
});

export const diffImpactSchema = z.enum(['low', 'medium', 'high']);

export const diffFieldsSchema = z.object({
  title: z.string().min(1).describe('Short title for the proposed change'),
  description: z.string().min(1).describe('Human-readable description of the change and why'),
  instruction: z.string().min(1).describe('Precise instruction for a coding agent'),
  area: z
    .string()
    .min(1)
    .max(120)
    .describe('Product area this change touches, e.g. Hero, Pricing, Checkout, Mobile, Navigation'),
  impact: diffImpactSchema.describe(
    'Expected business impact if the change is applied: low, medium or high',
  ),
  expected_outcome: z
    .string()
    .min(1)
    .max(2000)
    .describe('What should happen once the change is approved, implemented and deployed'),
});

export type DomDiff = z.infer<typeof domDiffSchema>;
export type DiffFields = z.infer<typeof diffFieldsSchema>;
export type DiffImpact = z.infer<typeof diffImpactSchema>;

const MAX_DOM_CHARS = 40_000;

export function truncateDom(html: string, max = MAX_DOM_CHARS): string {
  if (html.length <= max) {
    return html;
  }
  const half = Math.floor(max / 2);
  return `${html.slice(0, half)}\n<!-- truncated -->\n${html.slice(-half)}`;
}
