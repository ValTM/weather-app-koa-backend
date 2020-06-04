import fs from 'fs';
import jwt, { Secret } from 'jsonwebtoken';
import { Context, Next } from 'koa';
import { verifyKeys } from './utils';

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
const usersfile = 'users.json';
export default class Users {
  readonly userlist: userData;
  private readonly secret: Secret;

  constructor(secret: string) {
    this.secret = secret;
    try {
      this.userlist = JSON.parse(fs.readFileSync(usersfile, 'utf-8'));
    } catch (e) {
      console.error(`error when reading users file: ${e.message}`);
    }
  }

  public getListOfUsers(): string[] {
    return Object.keys(this.userlist).map(key => key);
  }

  /**
   * Generate a jwt token
   * @param payload
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  public generateToken(payload: string | object | Buffer): string {
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
   * Handler for login. It checks if the user exists and returns an error otherwise.
   * If the user exists it generates a token and returns it.
   * @param ctx
   */
  loginHandler(ctx: Context): void {
    const body = ctx.request.body;
    Users.verifyLoginInfo(body);
    const user = this.userlist[body.username];
    if (!user) {
      ctx.response.status = 409;
      ctx.body = { error: 'Username not registered' };
      return;
    }
    if (user.passwordhash !== body.passwordhash) {
      ctx.response.status = 401;
      ctx.body = { error: 'Wrong credentials' };
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
    const body = ctx.request.body;
    Users.verifyLoginInfo(body);
    if (this.userlist[body.username]) {
      ctx.response.status = 409;
      ctx.body = { error: 'username already registered' };
      return;
    }
    this.userlist[body.username] = { passwordhash: body.passwordhash };
    try {
      fs.writeFileSync(usersfile, JSON.stringify(this.userlist));
    } catch (e) {
      console.error(`error when writing users file: ${e.message}`);
      delete this.userlist[body.username];
      ctx.response.status = 500;
      ctx.body = { error: 'something went wrong when registering' };
    }
    ctx.body = { message: 'registered successfully', token: this.generateToken({ sub: body.username }) };
  }
}
