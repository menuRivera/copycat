import { truncateDom } from '../schemas/domDiff';
import type { PromptPair } from './types';

export function buildDomDiffPrompts(oldDom: string, newDom: string): PromptPair {
  return {
    instructions:
      'You compare two versions of the same web page DOM. Report only product-relevant changes: copy, layout, structure, pricing, features, CTAs. Each distinct change appears once, even when it spans several nodes. Ignore analytics tags, nonces, cache-busting ids, timestamps, attribute order, whitespace and other noise. For each change return a stable CSS selector that locates the section in both versions (it is later used to crop screenshots), a one-sentence summary, and the short old/new text that changed. Return an empty list when nothing product-relevant changed.',
    prompt: `OLD DOM:\n${truncateDom(oldDom)}\n\nNEW DOM:\n${truncateDom(newDom)}`,
  };
}

export const DESCRIBE_VISUAL_DIFF_INSTRUCTIONS =
  'You describe visual differences between two screenshots of the same web page section for a product team. In 2 to 4 plain sentences, state what visibly changed (layout, copy, imagery, pricing, CTA) and what it likely means for users. No preamble, no markdown, no code.';

export const DESCRIBE_VISUAL_DIFF_PROMPT =
  'Describe the difference between the old and the new image.';

export function buildGapDiffPrompts(input: {
  ownDom: string;
  competitorDom: string;
  projectName: string;
  repoUrl: string;
  competitorName: string;
}): PromptPair {
  return {
    instructions:
      'You compare our product page (OLD DOM) with a competitor page (NEW DOM). Report only actionable gaps where the competitor is better: content, features, structure, pricing or CTAs that we lack or do worse. Omit anything we already match or exceed. Each gap appears once. Ignore analytics tags, nonces, cache-busting ids, timestamps and noise. For each gap return a CSS selector that locates the section on the competitor page, a one-sentence summary, and the relevant old/new text. Return an empty list when there is no actionable gap.',
    prompt: `Our product (${input.projectName}, ${input.repoUrl}):\n${truncateDom(input.ownDom)}\n\nCompetitor (${input.competitorName}):\n${truncateDom(input.competitorDom)}`,
  };
}

export function buildInitFieldsPrompt(input: {
  projectName: string;
  repoUrl: string;
  competitorName: string;
  competitorUrl: string;
  competitorDom: string;
}): PromptPair {
  return {
    instructions:
      'Our repository is empty and we are starting a new product. Based on the competitor reference below, write a short specific title, a human-readable description of what should be built, and a precise instruction for a coding agent: initialize the project, choose a sensible stack, and scaffold the core pages and sections so the new product covers what the competitor reference offers. Classify the product area, judge the expected business impact (low, medium or high: how many users it reaches and how much it affects conversion or revenue), and state a measurable expected outcome for once the change is applied.',
    prompt: [
      `Project: ${input.projectName}`,
      `Repository: ${input.repoUrl}`,
      `Competitor: ${input.competitorName} (${input.competitorUrl})`,
      'Competitor DOM:',
      truncateDom(input.competitorDom),
    ].join('\n'),
  };
}

export function buildDiffFieldsPrompt(input: {
  domDiffSummary: string;
  oldText: string;
  newText: string;
  visualDescription: string | null;
  projectName: string;
  repoUrl: string;
}): PromptPair {
  return {
    instructions:
      'You turn a competitor change into a proposed change for our own product. Write a short specific title, a human-readable description explaining what the competitor changed and why it may matter for us, and a precise instruction for a coding agent working in our repository: reference the affected page or section, follow the existing stack and conventions from the repository, and keep the change scoped to this request. Classify the product area, judge the expected business impact (low, medium or high: how many users it reaches and how much it affects conversion or revenue), and state a measurable expected outcome for once the change is applied.',
    prompt: [
      `Our project: ${input.projectName}`,
      `Our repository: ${input.repoUrl}`,
      `Competitor DOM change: ${input.domDiffSummary}`,
      `Old text: ${input.oldText}`,
      `New text: ${input.newText}`,
      input.visualDescription ? `Visual description: ${input.visualDescription}` : null,
    ]
      .filter((line): line is string => line !== null)
      .join('\n'),
  };
}
