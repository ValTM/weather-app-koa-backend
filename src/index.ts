import Koa, { Context, Next } from 'koa';
import KoaBodyParser from 'koa-bodyparser';
import KoaJson from 'koa-json';
import KoaJwtValidator from 'koa-jwt';
import KoaRouter from 'koa-router';
import * as base64 from 'base-64';
import Users from './users';
import { PermissionsGuardMw } from './permissionGuardMw';

const port = process.env.EXPRESS_PORT || 3000;
const secret = process.env.JWT_SECRET || base64.encode(unescape(encodeURIComponent('Val\'s super secure secret')));
// VmFsJ3Mgc3VwZXIgc2VjdXJlIHNlY3JldA== for token validation in jwt.io

const app = new Koa();
const router = new KoaRouter();
const users = new Users(secret);

app.use(KoaBodyParser());
app.use(KoaJson());
app.use(KoaJwtValidator({ secret }).unless({ path: ['/login', '/register', '/'] }));
/** Health check */
router.get('/', (ctx: Context) => ctx.body = 'OK');
router.post('/login', users.loginHandler.bind(users));
router.post('/register', users.registerHandler.bind(users));
/** This guy is only here to test jwt auth with Postman.
 *  This comment is only here in case I forget to delete this endpoint*/
router.get('/ping', ctx => ctx.body = 'pong');
router.get('/users', PermissionsGuardMw('admin'), ctx => ctx.body = users.getListOfUsers());

app.use(router.routes()).use(router.allowedMethods());

app.on('error', (err, ctx: Context) => {
  console.error(err);
  ctx.body = { error: 'Something broke!', details: err.message };
});

app.listen(port, (): void => {
  console.info(`Koa listening on port ${port}`);
});
