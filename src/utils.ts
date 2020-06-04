/**
 * Verifies keys are present in target object
 * @param keys keys to look for
 * @param target any object
 */
export const verifyKeys = (keys: string[], target: unknown): boolean =>
  keys.every(key => Object.prototype.hasOwnProperty.call(target, key));
