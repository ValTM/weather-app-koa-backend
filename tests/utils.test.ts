import * as utils from '../src/utils';
import { Context } from 'koa';

describe('utils tests', () => {
  describe('verifyKeys', () => {
    it.each([
      [[], {}, true],
      [['a'], { a: 1 }, true],
      [['b'], { a: 1 }, false],
      [['b'], {}, false]
    ])(`with %p %p %p`, (keys: string[], target: unknown, expected: boolean) => {
      expect(utils.verifyKeys(keys, target)).toBe(expected);
    });
  });
  describe('setError', () => {
    it.each([
      [1, 'string', undefined],
      [2, 'string', 'defined']
    ])(`with %p %p %p`, (status: number, error: string, details?: string) => {
      const ctx = {
        response: {
          status: 0
        },
        body: {
          error: '',
          details: undefined
        }
      };
      utils.setError(ctx as unknown as Context, status, error, details);
      expect(ctx.response.status).toBe(status);
      expect(ctx.body.error).toBe(error);
      expect(ctx.body.details).toBe(details);
    });
  });
});
