import { describe, expect, it } from 'vitest';
import { PLACEHOLDER_KEY, meshyEnv, outcomeOf, taskIdOf, type Envelope } from './meshy';

const envelope = (result: Record<string, unknown>): Envelope => ({
  schema_version: 'meshy.cli/v1',
  command: 'image-to-3d create',
  ok: true,
  result,
  error: null,
  warnings: [],
});

describe('meshy environment', () => {
  it('routes Node through the proxy and never needs the real key in the container', () => {
    const env = meshyEnv({ HTTPS_PROXY: 'http://proxy:3128' });
    expect(env['NODE_USE_ENV_PROXY']).toBe('1');
    expect(env['MESHY_API_KEY']).toBe(PLACEHOLDER_KEY);
    expect(env['NODE_NO_WARNINGS']).toBe('1');
  });

  it('keeps a key that is really in the environment', () => {
    expect(meshyEnv({ MESHY_API_KEY: 'from-env' })['MESHY_API_KEY']).toBe('from-env');
    expect(meshyEnv({})['NODE_USE_ENV_PROXY']).toBeUndefined();
  });
});

describe('meshy envelopes', () => {
  it('reads the task id from the submission or the task view', () => {
    expect(taskIdOf(envelope({ submission: { task_id: 'abc' } }))).toBe('abc');
    expect(taskIdOf(envelope({ task_id: 'def', task: { task_id: 'def' } }))).toBe('def');
    expect(taskIdOf(envelope({}))).toBeNull();
  });

  it('keeps unreported credits as null instead of zero', () => {
    const o = outcomeOf(
      envelope({
        task_id: 't1',
        task: { task_id: 't1', status: 'SUCCEEDED', consumed_credits: null, face_count: 3980 },
      }),
    );
    expect(o).toEqual({
      taskId: 't1',
      status: 'SUCCEEDED',
      consumedCredits: null,
      faceCount: 3980,
    });
    expect(
      outcomeOf(envelope({ task_id: 't2', task: { status: 'IN_PROGRESS', consumed_credits: 20 } }))
        .consumedCredits,
    ).toBe(20);
  });
});
