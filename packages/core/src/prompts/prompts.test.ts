import { describe, expect, it } from 'vitest';
import { buildAnalyticDiffPrompt, buildStatementsPrompt } from './analytics';
import { buildDiffFieldsPrompt, buildDomDiffPrompts, buildGapDiffPrompts } from './llm';
import { DIFF_WORTHY_QUESTION, IS_VISUAL_DIFF_QUESTION, REVIEW_CHANGE_QUESTION } from './noul';
import {
  buildImplementPrompt,
  buildPlanPrompt,
  buildRefinePlanPrompt,
  formatChangeRequest,
  type AgentChangeRequest,
} from './agent';

const request: AgentChangeRequest = {
  title: 'Add pricing page',
  area: 'Pricing',
  impact: 'high',
  description: 'Competitor added a pricing page.',
  instruction: 'Create /pricing with three tiers.',
  expectedOutcome: 'More plan signups.',
};

describe('buildDomDiffPrompts', () => {
  it('labels both versions and keeps short DOM intact', () => {
    const { instructions, prompt } = buildDomDiffPrompts('<div>old</div>', '<div>new</div>');
    expect(prompt).toBe('OLD DOM:\n<div>old</div>\n\nNEW DOM:\n<div>new</div>');
    expect(instructions).toContain('product-relevant');
  });

  it('truncates long DOM', () => {
    const { prompt } = buildDomDiffPrompts('a'.repeat(50_000), 'b'.repeat(50_000));
    expect(prompt).toContain('<!-- truncated -->');
  });
});

describe('buildGapDiffPrompts', () => {
  it('marks ours as OLD and competitor as NEW', () => {
    const { prompt } = buildGapDiffPrompts({
      ownDom: '<html>ours</html>',
      competitorDom: '<html>theirs</html>',
      projectName: 'Copycat',
      repoUrl: 'https://github.com/x/y',
      competitorName: 'Rival',
    });
    expect(prompt).toContain('Our product (Copycat');
    expect(prompt).toContain('Competitor (Rival)');
    expect(prompt.indexOf('ours')).toBeLessThan(prompt.indexOf('theirs'));
  });
});

describe('buildDiffFieldsPrompt', () => {
  it('includes the visual description when present and omits it otherwise', () => {
    const base = {
      domDiffSummary: 'Hero copy changed',
      oldText: 'Old hero',
      newText: 'New hero',
      projectName: 'Copycat',
      repoUrl: 'https://github.com/x/y',
    };
    expect(buildDiffFieldsPrompt({ ...base, visualDescription: 'Bigger CTA' }).prompt).toContain(
      'Visual description: Bigger CTA',
    );
    expect(buildDiffFieldsPrompt({ ...base, visualDescription: null }).prompt).not.toContain(
      'Visual description',
    );
  });
});

describe('buildStatementsPrompt', () => {
  it('embeds the metric values', () => {
    const { instructions, prompt } = buildStatementsPrompt({
      metrics: [
        { metric: 'noop_clicks:contact', thisMonth: 40, prevMonth: 30, delta: 10 },
        { metric: 'funnel_visit_to_click_pct', thisMonth: 22, prevMonth: 31, delta: -9 },
      ],
      project: { name: 'Copycat', repoUrl: 'https://github.com/x/y' },
    });
    expect(prompt).toContain('noop_clicks:contact');
    expect(prompt).toContain('"thisMonth": 40');
    expect(instructions).toContain('conversion, ux, performance, content');
    expect(instructions).toContain('never invent data');
  });
});

describe('buildAnalyticDiffPrompt', () => {
  it('carries the statement numbers into the prompt', () => {
    const { prompt } = buildAnalyticDiffPrompt({
      statement: {
        category: 'ux',
        statement: 'contact page has 40 no-op clicks, up from 30',
        explanation: 'Broken affordance',
      },
      project: { name: 'Copycat', repoUrl: 'https://github.com/x/y' },
    });
    expect(prompt).toContain('40 no-op clicks');
    expect(prompt).toContain('up from 30');
  });
});

describe('noul questions', () => {
  it('asks one question each', () => {
    for (const question of [IS_VISUAL_DIFF_QUESTION, DIFF_WORTHY_QUESTION, REVIEW_CHANGE_QUESTION]) {
      expect(question.match(/\?/g)).toHaveLength(1);
    }
  });

  it('review question covers implementation only', () => {
    expect(REVIEW_CHANGE_QUESTION.toLowerCase()).toContain('implement');
    expect(REVIEW_CHANGE_QUESTION.toLowerCase()).not.toContain('test');
  });
});

describe('agent prompts', () => {
  it('formats the request with fallbacks for missing fields', () => {
    const text = formatChangeRequest({ ...request, area: null, impact: null, expectedOutcome: null });
    expect(text).toContain('Area: unknown');
    expect(text).toContain('Impact: unknown');
    expect(text).toContain('Expected outcome: not specified');
  });

  it('plan prompt includes the request and forbids edits', () => {
    const text = buildPlanPrompt(request);
    expect(text).toContain('Title: Add pricing page');
    expect(text).toContain('Do not modify any files');
  });

  it('implement prompt includes the plan and forbids committing', () => {
    const text = buildImplementPrompt(request, 'Step 1: create page');
    expect(text).toContain('Step 1: create page');
    expect(text).toContain('do not run git commit');
  });

  it('refine prompt includes the failing diff and test output', () => {
    const text = buildRefinePlanPrompt({
      request,
      diffText: '+ broken',
      testOutput: 'FAIL pricing.test.ts',
    });
    expect(text).toContain('+ broken');
    expect(text).toContain('FAIL pricing.test.ts');
    expect(text).toContain('diagnose the root cause');
  });
});
