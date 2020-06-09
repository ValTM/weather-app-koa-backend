import PermissionGuardMw from '../src/permissionGuardMw';
import { setError } from '../src/utils';

jest.mock('../src/utils', () => {
  return {
    setError: jest.fn()
  };
});

describe('permissionGuardMw tests', () => {
  it.each([
    [['admin'], 'admin', false, ''],
    ['admin', 'admin', false, ''],
    [['admin'], 'other', true, 'Insufficient permissions'],
    [['other'], 'admin', true, 'Insufficient permissions'],
    [[1], 'admin', true, 'Broken permissions object in token'],
    [{}, 'whatever', true, 'Broken permissions object in token']
  ])('handles %p %p %p %s',
    async (permissions: string[], reqPermission: string, shouldError: boolean, errorMessage: string) => {
      const ctx = {
        state: {
          user: {
            permissions
          }
        }
      };
      const next = jest.fn();
      const mw = PermissionGuardMw(reqPermission);
      // @ts-ignore
      await mw(ctx, next);
      if (shouldError) {
        expect(setError).toHaveBeenCalledWith(ctx, 400, errorMessage);
      } else {
        expect(setError).not.toHaveBeenCalled();
      }
    });
  it('throws for no permissions', async () => {
    const ctx = {
      state: {
        user: {}
      }
    };
    const next = jest.fn();
    const mw = PermissionGuardMw('whatever');
    // @ts-ignore
    await mw(ctx, next);
    expect(setError).toHaveBeenCalledWith(ctx, 400, 'Missing permissions object in token');
  });
});
