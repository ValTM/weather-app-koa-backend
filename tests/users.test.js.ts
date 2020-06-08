//@ts-nocheck
import { setError } from '../src/utils';
import Router from 'koa-router';
import Users from '../src/users';

// Prevent disk access
jest.mock('fs', () => {
  return {
    readFileSync: jest.fn().mockImplementation(() => {
    }),
    writeFileSync: jest.fn().mockImplementation(() => {
    })
  };
});
jest.mock('../src/utils', () => {
  return {
    setError: jest.fn()
  };
});
const userdata = { 'admin': { 'passwordhash': 'a', 'isAdmin': true } };
describe('Users tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('constructor', () => {
    let registerRoutesSpy;
    let routerGetSpy;
    let routerPostSpy;
    let routerDeleteSpy;
    beforeEach(() => {
      routerGetSpy = jest.spyOn(Router.prototype, 'get').mockImplementation(() => {
      });
      routerDeleteSpy = jest.spyOn(Router.prototype, 'delete').mockImplementation(() => {
      });
      routerPostSpy = jest.spyOn(Router.prototype, 'post').mockImplementation(() => {
      });
      registerRoutesSpy = jest.spyOn(Users.prototype, 'registerRoutes');
      jest.spyOn(global.console, 'error').mockImplementationOnce(() => {
      });
    });
    it('works normally', () => {
      JSON.parse = jest.fn().mockImplementationOnce(() => {
        return userdata;
      });
      expect(new Users('secret').userlist).toBe(userdata);
      expect(registerRoutesSpy).toHaveBeenCalled();
      expect(routerGetSpy).toHaveBeenCalledTimes(1);
      expect(routerDeleteSpy).toHaveBeenCalledTimes(1);
      expect(routerPostSpy).toHaveBeenCalledTimes(2);
    });
    it('throws', () => {
      // console is annoying in the test
      jest.spyOn(Users.prototype, 'readUserFile')
        .mockImplementationOnce(() => {
          throw new Error('');
        });
      expect(new Users('secret')).toThrow;
      expect(registerRoutesSpy).not.toHaveBeenCalled();
    });
  });
  describe('deleteUserHandler', () => {
    let writeUserFileSpy;
    let readUserFileSpy;
    let users;
    beforeEach(() => {
      writeUserFileSpy = jest.spyOn(Users.prototype, 'writeUserFile');
      readUserFileSpy = jest.spyOn(Users.prototype, 'readUserFile').mockImplementation(() => {
      });
      users = new Users('secret');
      // clear it, because the constructor calls it
      readUserFileSpy.mockClear();
    });
    it.each([
      [{ admin: { isAdmin: true } }, { params: { username: 'a' } }, 404, 'user not found'],
      [{ admin: { isAdmin: true } }, { params: { username: 'admin' } }, 400, 'You cannot delete the admin user']
    ])(`errors with %o %o %p %p`,
      (userlist: unknown, ctx: unknown, status: number, error: string) => {
        users.userlist = userlist;
        users.deleteUserHandler(ctx);
        expect(setError).toHaveBeenCalledWith(ctx, status, error);
        expect(writeUserFileSpy).not.toHaveBeenCalled();
      });

    it('writes correctly', () => {
      users.userlist = { a: {} };
      const ctx = { params: { username: 'a' } };
      users.deleteUserHandler(ctx);
      expect(users.userlist).toStrictEqual({});
      expect(writeUserFileSpy).toHaveBeenCalled();
      expect(ctx.body).toStrictEqual({ message: 'successfully deleted user' });
      expect(readUserFileSpy).not.toHaveBeenCalled();
    });

    it('errors on write throw', () => {
      users.userlist = { a: {} };
      const ctx = { params: { username: 'a' } };
      writeUserFileSpy.mockImplementationOnce(()=>{
        throw new Error('something');
      });
      expect(users.deleteUserHandler(ctx)).toThrow;
      expect(users.userlist).toStrictEqual({});
      expect(writeUserFileSpy).toHaveBeenCalled();
      expect(readUserFileSpy).toHaveBeenCalled();
      expect(setError).toHaveBeenCalledWith(ctx, 500, 'something went wrong when deleting user');
    });
  });
});
