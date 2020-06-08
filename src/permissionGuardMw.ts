import Koa, { Context, Next } from 'koa';
import get from 'lodash/get';
import { setError } from './utils';

/**
 * A simple jwt permissions guard middleware. This implies we're putting a "permissions" property in our token,
 * containing either a string with space separated permissions, or an array of strings each representing a permission
 * It then checks them agains the required permissions for the route and stops the response cycle with a 400 message
 * if the token has insufficient permissions
 * @param requiredPermissions a space-delimited string of permissions, or an array of strings each representing a
 * permission, that are required for the route this middleware is installed on
 * @constructor
 */
export const PermissionsGuardMw = (requiredPermissions: string | string[]): Koa.Middleware => {
  /**
   * A function to convert strings to arrays of strings splitting them by whitespace, in order to be able to support
   * {permissions: "read write execute"} type of permissions definition
   * @param astring the string to convert
   */
  const convertStringToArray = (astring: string | string[]) => {
    return (typeof astring === 'string') ? astring.trim().split(' ') : astring;
  };
  /**
   * In case of more general use for this middleware
   * @param permissionsObject
   */
  const isCorrectType = (permissionsObject: unknown): boolean => {
    if (typeof permissionsObject === 'string') return true;
    if (Array.isArray(permissionsObject)) {
      if (permissionsObject.every(permission => typeof permission === 'string')) {
        return true;
      }
    }
    return false;
  };
  /**
   * throws an error if the decoded token permissions object is missing
   * @param ctx
   */
  const doTokenPermissionsExist = (ctx: Context) => {
    if (!get(ctx, 'state.user.permissions'))
      throw new Error('Missing permissions object in token');
  };
  /**
   * The jwt guard doing all token checks. It throws different errors depending on the failure modes
   * @param ctx
   * @param requiredPermissions
   */
  const jwtPermissionsGuard = (ctx: Context, requiredPermissions: string | string[]): void => {
    doTokenPermissionsExist(ctx);
    const tokenPermissions = ctx.state.user.permissions;
    if (!isCorrectType(tokenPermissions)) {
      throw new Error('Broken permissions object in token');
    }
    const tokenPerms: string[] = convertStringToArray(tokenPermissions);
    const reqPerms: string[] = convertStringToArray(requiredPermissions);

    if (!reqPerms.every(required => tokenPerms.includes(required))) {
      throw new Error('Insufficient permissions');
    }
  };
  return async (ctx: Context, next: Next) => {
    try {
      jwtPermissionsGuard(ctx, requiredPermissions);
    } catch (e) {
      setError(ctx, 400, e.message);
      return;
    }
    await next();
  };
};
