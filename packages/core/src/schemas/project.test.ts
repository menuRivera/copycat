import { describe, expect, it } from 'vitest';
import { projectCreateSchema } from './project';

const valid = {
  name: 'Copycat',
  repo_url: 'https://github.com/example/copycat',
  deployment_url: 'https://copycat.example.com',
  competitors: [{ name: 'Rival', url: 'https://rival.example.com' }],
};

describe('projectCreateSchema', () => {
  it('accepts a valid project', () => {
    const parsed = projectCreateSchema.parse(valid);
    expect(parsed.name).toBe('Copycat');
    expect(parsed.competitors).toHaveLength(1);
  });

  it('rejects a missing name', () => {
    expect(projectCreateSchema.safeParse({ ...valid, name: '  ' }).success).toBe(false);
  });

  it('rejects a non-http repo url', () => {
    expect(projectCreateSchema.safeParse({ ...valid, repo_url: 'ftp://example.com' }).success).toBe(
      false,
    );
  });

  it('rejects zero competitors', () => {
    expect(projectCreateSchema.safeParse({ ...valid, competitors: [] }).success).toBe(false);
  });

  it('rejects an invalid competitor url', () => {
    expect(
      projectCreateSchema.safeParse({ ...valid, competitors: [{ url: 'not-a-url' }] }).success,
    ).toBe(false);
  });

  it('treats an empty deployment_url as undefined', () => {
    const parsed = projectCreateSchema.parse({ ...valid, deployment_url: '' });
    expect(parsed.deployment_url).toBeUndefined();
  });
});
