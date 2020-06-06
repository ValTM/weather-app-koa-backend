/**
 * Verifies keys are present in target object
 * @param keys keys to look for
 * @param target any object
 */
import { Context } from 'koa';

export const verifyKeys = (keys: string[], target: unknown): boolean =>
  keys.every(key => Object.prototype.hasOwnProperty.call(target, key));

export const setError = (ctx: Context, status: number, error: string, details? : unknown): void => {
  ctx.response.status = status;
  ctx.body = { error, details };
};
