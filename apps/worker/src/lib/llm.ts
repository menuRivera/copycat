import { generateObject, generateText } from 'ai';
import {
  buildDiffFieldsPrompt,
  buildDomDiffPrompts,
  buildGapDiffPrompts,
  buildInitFieldsPrompt,
  DESCRIBE_VISUAL_DIFF_INSTRUCTIONS,
  DESCRIBE_VISUAL_DIFF_PROMPT,
  diffFieldsSchema,
  domDiffListSchema,
  type DiffFields,
  type DomDiff,
} from '@copycat/core';
import { getModel } from './model';

export async function generateDomDiffs(oldDom: string, newDom: string): Promise<DomDiff[]> {
  const { object } = await generateObject({
    model: getModel(),
    schema: domDiffListSchema,
    ...buildDomDiffPrompts(oldDom, newDom),
  });
  return object.diffs;
}

export async function describeVisualDiff(oldPng: Buffer, newPng: Buffer): Promise<string> {
  const { text } = await generateText({
    model: getModel(),
    instructions: DESCRIBE_VISUAL_DIFF_INSTRUCTIONS,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Old version:' },
          { type: 'image', image: oldPng, mediaType: 'image/png' },
          { type: 'text', text: 'New version:' },
          { type: 'image', image: newPng, mediaType: 'image/png' },
          { type: 'text', text: DESCRIBE_VISUAL_DIFF_PROMPT },
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
    ...buildGapDiffPrompts(input),
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
    ...buildInitFieldsPrompt(input),
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
    ...buildDiffFieldsPrompt({
      domDiffSummary: input.domDiff.summary,
      oldText: input.domDiff.old_text,
      newText: input.domDiff.new_text,
      visualDescription: input.visualDescription,
      projectName: input.projectName,
      repoUrl: input.repoUrl,
    }),
  });
  return object;
}
