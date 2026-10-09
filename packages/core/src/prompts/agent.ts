export type AgentChangeRequest = {
  title: string;
  area: string | null;
  impact: string | null;
  description: string;
  instruction: string;
  expectedOutcome: string | null;
};

export function formatChangeRequest(request: AgentChangeRequest): string {
  return [
    `Title: ${request.title}`,
    `Area: ${request.area ?? 'unknown'}`,
    `Impact: ${request.impact ?? 'unknown'}`,
    `Description: ${request.description}`,
    `Instruction: ${request.instruction}`,
    `Expected outcome: ${request.expectedOutcome ?? 'not specified'}`,
  ].join('\n');
}

export function buildPlanPrompt(request: AgentChangeRequest): string {
  return `You are planning a code change in this repository. Read the repository conventions (AGENTS.md, README, package manifests) and the relevant code, then produce a detailed, concrete implementation plan for the change request below: name the files to touch, the steps in order, and how to verify the result. Do not modify any files.

Change request:
${formatChangeRequest(request)}`;
}

export function buildImplementPrompt(request: AgentChangeRequest, plan: string): string {
  return `Implement the change request below in this repository. Follow the plan, keep the change scoped to this request, do not touch unrelated files, update or add tests when behavior changes, and run the relevant checks when the repository provides them. Make all code changes, then stop: the harness commits your changes for you, do not run git commit.

Change request:
${formatChangeRequest(request)}

Plan:
${plan}`;
}

export function buildRefinePlanPrompt(input: {
  request: AgentChangeRequest;
  diffText: string;
  testOutput: string;
}): string {
  return `A previous implementation attempt for the change request below is not valid yet. Inspect the repository and the current changes, diagnose the root cause of the failing tests or the incomplete implementation, then produce a refined, concrete implementation plan that fixes the issues. Do not modify files.

Change request:
${formatChangeRequest(input.request)}

Current git diff:
${input.diffText}

Test result:
${input.testOutput}`;
}
