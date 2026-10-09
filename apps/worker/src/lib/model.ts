import { anthropic } from '@ai-sdk/anthropic';
import { env } from '@copycat/core';

export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-5';

export function getModel() {
  return anthropic(env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL);
}
