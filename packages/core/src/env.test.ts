import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('parseEnv', () => {
  it('applies temporal defaults', () => {
    const parsed = parseEnv({});
    expect(parsed.TEMPORAL_ADDRESS).toBe('localhost:7233');
    expect(parsed.TEMPORAL_NAMESPACE).toBe('default');
    expect(parsed.TEMPORAL_TASK_QUEUE).toBe('copycat');
  });

  it('treats empty strings as undefined', () => {
    const parsed = parseEnv({
      SUPABASE_URL: '',
      SUPABASE_SERVICE_ROLE_KEY: '   ',
      TYPESAFE_API_KEY: '',
      ANTHROPIC_API_KEY: '',
    });
    expect(parsed.SUPABASE_URL).toBeUndefined();
    expect(parsed.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(parsed.TYPESAFE_API_KEY).toBeUndefined();
    expect(parsed.ANTHROPIC_API_KEY).toBeUndefined();
  });

  it('keeps real values', () => {
    const parsed = parseEnv({ TYPESAFE_API_KEY: 'ts-key' });
    expect(parsed.TYPESAFE_API_KEY).toBe('ts-key');
  });
});
