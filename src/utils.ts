// Just a small utilities file

import { Context } from 'koa';

/**
 * Verifies keys are present in target object
 * @param keys keys to look for
 * @param target any object
 */
export const verifyKeys = (keys: string[], target: unknown): boolean =>
  keys.every(key => Object.prototype.hasOwnProperty.call(target, key));

/**
 * Sets an error body to the koa context object
 * @param ctx
 * @param status
 * @param error
 * @param details
 */
export const setError = (ctx: Context, status: number, error: string, details?: unknown): void => {
  ctx.response.status = status;
  ctx.body = { error, details };
};
