import { TypeSafeClient, noul } from '@typesafe-ai/sdk';
import { env, IS_VISUAL_DIFF_QUESTION, type DomDiff } from '@copycat/core';

export const NOUL_YES_THRESHOLD = 0.5;

let client: TypeSafeClient | null = null;

function getClient(): TypeSafeClient {
  client ??= new TypeSafeClient({ apiKey: env.TYPESAFE_API_KEY });
  return client;
}

export async function askNoul(instructions: string, state: unknown): Promise<number> {
  const { answers } = await getClient().systemOne({
    state: state as string,
    questions: { answer: noul(instructions) },
  });
  return answers.answer.noul;
}

export async function isVisualDiff(domDiff: DomDiff): Promise<boolean> {
  const value = await askNoul(IS_VISUAL_DIFF_QUESTION, {
    selector: domDiff.selector,
    summary: domDiff.summary,
    old_text: domDiff.old_text,
    new_text: domDiff.new_text,
  });
  return value > NOUL_YES_THRESHOLD;
}
