import * as utils from '../utils';

describe('utils tests', () => {
  test.each([
    [[], {}, true],
    [['a'], { a: 1 }, true],
    [['b'], { a: 1 }, false],
    [['b'], {}, false]
  ])(`verifyKeys %p %p %p`, (keys: string[], target: unknown, expected: boolean) => {
    expect(utils.verifyKeys(keys, target)).toBe(expected);
  });
  test.each([
    [1, 'string', undefined],
    [2, 'string', 'defined']
  ])(`setError %p %p %p`, (status: number, error: string, details?: string) => {
    const ctx = {
      response: {
        status: 0
      },
      body: {
        error: '',
        details: undefined
      }
    };
    // @ts-ignore
    utils.setError(ctx, status, error, details);
    expect(ctx.response.status).toBe(status);
    expect(ctx.body.error).toBe(error);
    expect(ctx.body.details).toBe(details);
  });
});
