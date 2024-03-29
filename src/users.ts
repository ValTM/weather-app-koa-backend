import fs from 'fs';
import jwt, { Secret } from 'jsonwebtoken';
import { Context } from 'koa';
import { setError, verifyKeys } from './utils';
import PermissionsGuardMw from './permissionGuardMw';
import Router from 'koa-router';
import cryptojs from 'crypto-js';

export type userBody = {
  username: string;
  passwordhash: string;
}

export type userData = {
  [key: string]: {
    passwordhash: string;
    isAdmin?: boolean;
  };
}
const salt = cryptojs.SHA256('S$$apEWnlpd7d*Pus#86FXA3HkDO@z1jXUkv');

/**
 * A class to manage all user operations - login, registration, user maanagement by the admin
 */
export default class Users {
  private userlist: userData;
  private readonly secret: Secret;
  private readonly usersfile: string;
  router: Router;

  constructor(secret: string, usersfile = 'users.json') {
    this.usersfile = usersfile;
    this.secret = secret;
    this.router = new Router();
    try {
      this.readUserFile();
      this.registerRoutes();
    } catch (e) {
      console.error(`error when reading users file: ${e.message}`);
    }
  }

  private readUserFile() {
    this.userlist = JSON.parse(fs.readFileSync(this.usersfile, 'utf-8'));
  }

  private writeUserFile() {
    fs.writeFileSync(this.usersfile, JSON.stringify(this.userlist));
  }

  /**
   * Registers the different routes for user management
   */
  private registerRoutes() {
    this.router.post('/login', this.loginHandler.bind(this));
    this.router.post('/register', this.registerHandler.bind(this));
    this.router.get('/users', PermissionsGuardMw('admin'), ctx => ctx.body = this.getListOfUsers());
    this.router.delete('/users/:username', PermissionsGuardMw('admin'), this.deleteUserHandler.bind(this));
  }

  /**
   * Attempts to delete a user. It blocks deleting of an admin user.
   * It also tries to restore the file on a write failure
   * @param ctx
   */
  private deleteUserHandler(ctx: Context): void {
    const user = ctx.params.username;
    if (this.userlist[user]) {
      if (this.userlist[user].isAdmin) {
        setError(ctx, 400, 'You cannot delete the admin user');
        return;
      }
      delete this.userlist[user];
      try {
        this.writeUserFile();
        ctx.body = { message: 'successfully deleted user' };
      } catch (e) {
        console.error(`error when writing users file: ${e.message}`);
        // restore file
        this.readUserFile();
        setError(ctx, 500, 'something went wrong when deleting user');
        return;
      }
    } else {
      setError(ctx, 404, 'user not found');
    }
  }

  /**
   * Gets the list of users, including the isAdmin flag
   */
  private getListOfUsers(): { username: string, isAdmin: boolean }[] {
    return Object.keys(this.userlist).map(key => {
      return { username: key, isAdmin: this.userlist[key].isAdmin };
    });
  }

  /**
   * Generate a jwt token
   * @param payload
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  private generateToken(payload: string | object | Buffer): string {
    return jwt.sign(payload, this.secret, { expiresIn: '1h' });
  }

  /**
   * Basic login info verification
   * @param body
   */
  static verifyLoginInfo(body: userBody): void | never {
    if (!body) throw new Error('Missing request body');
    if (!verifyKeys(['username', 'passwordhash'], body)) throw new Error('Invalid request body');
    if (body.username === '' || body.passwordhash === '') throw new Error('Empty request field');
  }

  /**
   * Generates a salted hash of the password coming from the frontend, so we don't store plain text
   * @param passwordhash
   */
  private static getSaltedHash(passwordhash: string): string {
    // S E C U R I T Y
    return cryptojs.SHA256(salt + passwordhash).toString();
  }

  /**
   * Handler for login. It checks if the user exists and returns an error otherwise.
   * If the user exists it generates a token and returns it.
   * @param ctx
   */
  loginHandler(ctx: Context): void {
    const body = ctx.request.body as userBody;
    Users.verifyLoginInfo(body);
    const user = this.userlist[body.username];
    if (!user) {
      setError(ctx, 409, 'username not registered');
      return;
    }
    if (user.passwordhash !== Users.getSaltedHash(body.passwordhash)) {
      setError(ctx, 401, 'invalid credentials');
      return;
    }
    const payload = {
      sub: body.username,
      permissions: []
    };
    if (user.isAdmin) {
      payload.permissions.push('admin');
    }
    ctx.body = { message: 'login', token: this.generateToken(payload) };
  }

  /**
   * Registration handler - verifies we don't have the user already registered
   * and registers him otherwise, returning a token
   * @param ctx
   */
  registerHandler(ctx: Context): void {
    const body = ctx.request.body as userBody;
    Users.verifyLoginInfo(body);
    if (this.userlist[body.username]) {
      setError(ctx, 409, 'username already registered');
      return;
    }
    this.userlist[body.username] = { passwordhash: Users.getSaltedHash(body.passwordhash) };
    try {
      this.writeUserFile();
    } catch (e) {
      console.error(`error when writing users file: ${e.message}`);
      delete this.userlist[body.username];
      setError(ctx, 500, 'something went wrong when registering');
      return;
    }
    ctx.body = { message: 'registered successfully', token: this.generateToken({ sub: body.username }) };
  }
}
