import { query } from '@anthropic-ai/claude-agent-sdk';

export async function runAgent(input: {
  cwd: string;
  prompt: string;
  allowedTools: string[];
  maxTurns: number;
}): Promise<string> {
  let result = '';

  for await (const message of query({
    prompt: input.prompt,
    options: {
      cwd: input.cwd,
      allowedTools: input.allowedTools,
      permissionMode: 'acceptEdits',
      maxTurns: input.maxTurns,
    },
  })) {
    if (message.type === 'result') {
      if (message.subtype === 'success') {
        result = message.result;
      } else {
        throw new Error(`agent run failed: ${message.subtype}`);
      }
    }
  }

  return result;
}
