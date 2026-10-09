import { TypeSafeClient, noul } from '@typesafe-ai/sdk';
import { env, type DomDiff } from '@copycat/core';

export const NOUL_YES_THRESHOLD = 0.5;

let client: TypeSafeClient | null = null;

function getClient(): TypeSafeClient {
  client ??= new TypeSafeClient({ apiKey: env.TYPESAFE_API_KEY });
  return client;
}

export async function isVisualDiff(domDiff: DomDiff): Promise<boolean> {
  const { answers } = await getClient().systemOne({
    state: {
      selector: domDiff.selector,
      summary: domDiff.summary,
      old_text: domDiff.old_text,
      new_text: domDiff.new_text,
    },
    questions: {
      visual: noul(
        'Is this DOM change a visual diff, meaning users would notice it on the rendered page, rather than a purely structural, meta, or invisible change?',
      ),
    },
  });
  return answers.visual.noul > NOUL_YES_THRESHOLD;
}
