import { generateObject, generateText } from 'ai';
import {
  diffFieldsSchema,
  domDiffListSchema,
  truncateDom,
  type DiffFields,
  type DomDiff,
} from '@copycat/core';
import { getModel } from './model';

export async function generateDomDiffs(oldDom: string, newDom: string): Promise<DomDiff[]> {
  const { object } = await generateObject({
    model: getModel(),
    schema: domDiffListSchema,
    instructions:
      'You compare two versions of the same web page DOM. Report only changes that are relevant to the product: copy, layout, structure, pricing, features, CTAs. Ignore analytics tags, nonces, cache-busting ids, timestamps, and other noise. For each relevant change return a CSS selector that locates the changed section in both versions, a one-sentence summary, and the relevant old/new text.',
    prompt: `OLD DOM:\n${truncateDom(oldDom)}\n\nNEW DOM:\n${truncateDom(newDom)}`,
  });
  return object.diffs;
}

export async function describeVisualDiff(oldPng: Buffer, newPng: Buffer): Promise<string> {
  const { text } = await generateText({
    model: getModel(),
    instructions:
      'You describe visual differences between two screenshots of the same web page section, for a product team. Be specific and concise: what changed visually and what it likely means.',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Old version:' },
          { type: 'image', image: oldPng, mediaType: 'image/png' },
          { type: 'text', text: 'New version:' },
          { type: 'image', image: newPng, mediaType: 'image/png' },
          { type: 'text', text: 'Describe the difference between the old and the new image.' },
        ],
      },
    ],
  });
  return text;
}

export async function generateGapDiffs(input: {
  ownDom: string;
  competitorDom: string;
  projectName: string;
  repoUrl: string;
  competitorName: string;
}): Promise<DomDiff[]> {
  const { object } = await generateObject({
    model: getModel(),
    schema: domDiffListSchema,
    instructions:
      'You compare our product page (OLD DOM) with a competitor page (NEW DOM). Report only actionable gaps: content, features, structure, pricing, or CTAs the competitor has and we lack or do worse. Ignore analytics tags, nonces, cache-busting ids, timestamps, and noise. For each gap return a CSS selector that locates the section on the competitor page, a one-sentence summary, and the relevant old/new text.',
    prompt: `Our product (${input.projectName}, ${input.repoUrl}):\n${truncateDom(input.ownDom)}\n\nCompetitor (${input.competitorName}):\n${truncateDom(input.competitorDom)}`,
  });
  return object.diffs;
}

export async function generateInitFields(input: {
  projectName: string;
  repoUrl: string;
  competitorName: string;
  competitorUrl: string;
  competitorDom: string;
}): Promise<DiffFields> {
  const { object } = await generateObject({
    model: getModel(),
    schema: diffFieldsSchema,
    instructions:
      'Our repository is empty and we are starting a new product. Based on the competitor reference below, write a short title, a human-readable description of what should be built, and a precise setup instruction for a coding agent: initialize the project, choose a sensible stack, and scaffold the core pages and sections to match the competitor reference. Also classify the product area, the expected business impact (low, medium or high), and what should happen once the change is applied.',
    prompt: [
      `Project: ${input.projectName}`,
      `Repository: ${input.repoUrl}`,
      `Competitor: ${input.competitorName} (${input.competitorUrl})`,
      'Competitor DOM:',
      truncateDom(input.competitorDom),
    ].join('\n'),
  });
  return object;
}

export async function generateDiffFields(input: {
  domDiff: DomDiff;
  visualDescription: string | null;
  projectName: string;
  repoUrl: string;
}): Promise<DiffFields> {
  const { object } = await generateObject({
    model: getModel(),
    schema: diffFieldsSchema,
    instructions:
      'You turn a competitor change into a proposed change for our own product. Write a short title, a human-readable description explaining the change and why it may matter, and a precise instruction for a coding agent working in our repository. Also classify the product area, the expected business impact (low, medium or high), and what should happen once the change is applied.',
    prompt: [
      `Our project: ${input.projectName}`,
      `Our repository: ${input.repoUrl}`,
      `Competitor DOM change: ${input.domDiff.summary}`,
      `Old text: ${input.domDiff.old_text}`,
      `New text: ${input.domDiff.new_text}`,
      input.visualDescription ? `Visual description: ${input.visualDescription}` : null,
    ]
      .filter((line): line is string => line !== null)
      .join('\n'),
  });
  return object;
}
