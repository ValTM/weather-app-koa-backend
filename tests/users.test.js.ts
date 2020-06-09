//@ts-nocheck
import { setError, verifyKeys } from '../src/utils';
import Router from 'koa-router';
import jwt from 'jsonwebtoken';
import cryptojs from 'crypto-js';
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
    setError: jest.fn(),
    verifyKeys: jest.fn()
  };
});
const userdata = { 'admin': { 'passwordhash': 'a', 'isAdmin': true } };
describe('Users tests', () => {
  beforeEach(() => {
    //disable console.error on throws, because it's very annoying
    jest.spyOn(global.console, 'error').mockImplementationOnce(() => true);
  });
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
      writeUserFileSpy.mockImplementationOnce(() => {
        throw new Error('something');
      });
      expect(users.deleteUserHandler(ctx)).toThrow;
      expect(users.userlist).toStrictEqual({});
      expect(writeUserFileSpy).toHaveBeenCalled();
      expect(readUserFileSpy).toHaveBeenCalled();
      expect(setError).toHaveBeenCalledWith(ctx, 500, 'something went wrong when deleting user');
    });
  });
  describe('getListOfUsers', () => {
    it('returns the correct information', () => {
      const users = new Users('secret');
      users.userlist = { admin: { passwordhash: '', isAdmin: true }, Val: { passwordhash: '' } };
      const result = users.getListOfUsers();
      expect(result.length).toBe(2);
      expect(result[0].username).toBe('admin');
      expect(result[0].isAdmin).toBe(true);
      expect(result[1].username).toBe('Val');
      expect(result[1].isAdmin).toBe(undefined);
    });
  });
  describe('generateToken', () => {
    it('returns a token', () => {
      const tokenSpy = jest.spyOn(jwt, 'sign').mockImplementationOnce(() => {
        return 'token';
      });
      const users = new Users('secret');
      const payload = { payload: 'payload' };
      const result = users.generateToken(payload);
      expect(result).toBe('token');
      expect(tokenSpy).toHaveBeenCalledWith(payload, 'secret', { expiresIn: '1h' });
    });
  });
  describe('verifyLoginInfo', () => {
    it.each([
      [undefined, 'Missing request body', false],
      [{}, 'Invalid request body', false],
      [{ username: '', passwordhash: '' }, 'Empty request field', true],
      [{ username: '', passwordhash: 'asd' }, 'Empty request field', true],
      [{ username: 'asd', passwordhash: '' }, 'Empty request field', true]
    ])('should throw %p %s %p', (body: unknown, error: string, returnValue: boolean) => {
      verifyKeys.mockImplementation(() => returnValue);
      try {
        expect(Users.verifyLoginInfo(body)).toThrow;
        fail();
      } catch (e) {
        expect(e.message).toBe(error);
      }
    });
    it('should not throw with correct info', () => {
      expect(Users.verifyLoginInfo(
        { username: 'something', passwordhash: 'also something' })).not.toThrow;
    });
  });
  describe('generateSaltedHash', () => {
    it('returns a hash from input parameters', () => {
      const SHA256Spy = jest.spyOn(cryptojs, 'SHA256').mockImplementation(() => {
        return 'hash';
      });
      const result = Users.getSaltedHash('plaintext');
      // for some reason I can't get the mocking to work properly, I guess because salt is outside of scope
      // ¯\_(ツ)_/¯
      expect(SHA256Spy).toHaveBeenCalledWith(
        '8de0154e7a49ae9b1db169c413b28cc08ce6a8e18a6a886bae9ecc7520d3e1beplaintext');
      expect(result).toBe('hash');
    });
  });
  describe('loginHandler', () => {
    let users;
    let getSaltedHashSpy;
    let verifyLoginInfoSpy;
    let generateTokenSpy;
    beforeEach(() => {
      getSaltedHashSpy = jest.spyOn(Users, 'getSaltedHash');
      verifyLoginInfoSpy = jest.spyOn(Users, 'verifyLoginInfo').mockImplementation(() => true);
      generateTokenSpy = jest.spyOn(Users.prototype, 'generateToken').mockImplementation(() => {
        return 'token';
      });
      users = new Users('secret');
    });
    it.each([
      [{ admin: { isAdmin: true } }, { request: { body: { username: 'a' } } }, '', 409, 'username not registered'],
      [{ admin: { isAdmin: true, passwordhash: 'cool' } },
        { request: { body: { username: 'admin', passwordhash: 'notcool' } } }, 'notcool', 401, 'invalid credentials']
    ])(`errors with %o %o %s %p %p`,
      (userlist: unknown, ctx: unknown, passhash: string, status: number, error: string) => {
        getSaltedHashSpy.mockImplementation(() => {
          return passhash;
        });
        users.userlist = userlist;
        users.loginHandler(ctx);
        expect(verifyLoginInfoSpy).toHaveBeenCalled();
        if (passhash !== '') expect(getSaltedHashSpy).toHaveBeenCalledWith(passhash);
        expect(setError).toHaveBeenCalledWith(ctx, status, error);
      });

    it.each([
      [{ request: { body: { username: 'admin', passwordhash: 'cool' } } }, { permissions: ['admin'], sub: 'admin' }],
      [{ request: { body: { username: 'Val', passwordhash: 'cool' } } }, { permissions: [], sub: 'Val' }]
    ])('gives back token with correct permissions for %o', (ctx: unknown, permissions: unknown) => {
      users.userlist = { admin: { isAdmin: true, passwordhash: 'cool' }, Val: { passwordhash: 'cool' } };
      getSaltedHashSpy.mockImplementationOnce(() => 'cool');
      users.loginHandler(ctx);
      verifyLoginInfoSpy.mockImplementationOnce(() => {
      });
      expect(generateTokenSpy).toHaveBeenCalledWith(permissions);
      expect(ctx.body).toStrictEqual({ message: 'login', token: 'token' });
    });
  });
  describe('registerHandler', () => {
    let users;
    let writeUserFileSpy;
    let getSaltedHashSpy;
    let verifyLoginInfoSpy;
    let generateTokenSpy;
    beforeEach(() => {
      getSaltedHashSpy = jest.spyOn(Users, 'getSaltedHash').mockImplementation(() => 'sosalty');
      verifyLoginInfoSpy = jest.spyOn(Users, 'verifyLoginInfo').mockImplementation(() => true);
      generateTokenSpy = jest.spyOn(Users.prototype, 'generateToken').mockImplementation(() => {
        return 'token';
      });
      writeUserFileSpy = jest.spyOn(Users.prototype, 'writeUserFile').mockImplementation(() => true);
      users = new Users('secret');
    });
    it(`errors on username collision`, () => {
      users.userlist = { admin: { isAdmin: true } };
      const ctx = { request: { body: { username: 'admin' } } };
      users.registerHandler(ctx);
      expect(verifyLoginInfoSpy).toHaveBeenCalled();
      expect(setError).toHaveBeenCalledWith(ctx, 409, 'username already registered');
      expect(writeUserFileSpy).not.toHaveBeenCalled();
    });

    it('writes correctly', () => {
      users.userlist = {};
      const ctx = { request: { body: { username: 'admin', passwordhash: 'cool' } } };
      users.registerHandler(ctx);
      expect(users.userlist).toStrictEqual({ admin: { passwordhash: 'sosalty' } });
      expect(writeUserFileSpy).toHaveBeenCalled();
      expect(getSaltedHashSpy).toHaveBeenCalledWith('cool');
      expect(generateTokenSpy).toHaveBeenCalledWith({ sub: 'admin' });
      expect(ctx.body).toStrictEqual({ message: 'registered successfully', token: 'token' });
    });

    it('errors on write throw', () => {
      //idk why I need to disable it again
      jest.spyOn(global.console, 'error').mockImplementationOnce(() => true);
      const userlist = { admin: {} };
      users.userlist = userlist;
      const ctx = { request: { body: { username: 'Val', passwordhash: 'cool' } } };
      writeUserFileSpy.mockImplementation(() => {
        throw new Error('something');
      });
      expect(users.registerHandler(ctx)).toThrow;
      expect(users.userlist).toStrictEqual(userlist);
      expect(writeUserFileSpy).toHaveBeenCalled();
      expect(setError).toHaveBeenCalledWith(ctx, 500, 'something went wrong when registering');
      expect(generateTokenSpy).not.toHaveBeenCalled();
    });
  });
});
