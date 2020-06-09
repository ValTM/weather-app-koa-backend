import Koa, { Context, Next } from 'koa';
import KoaBodyParser from 'koa-bodyparser';
import KoaJson from 'koa-json';
import KoaJwtValidator from 'koa-jwt';
import KoaRouter from 'koa-router';
import * as base64 from 'base-64';
import Users from './users';
import { setError } from './utils';
import Weather from './weather';
import gracefulShutdown from 'http-graceful-shutdown';

const port = process.env.EXPRESS_PORT || 4000;
const secret = process.env.JWT_SECRET || base64.encode(unescape(encodeURIComponent('Val\'s super secure secret')));
// VmFsJ3Mgc3VwZXIgc2VjdXJlIHNlY3JldA== for token validation in jwt.io

const app = new Koa();
const commonRouter = new KoaRouter();
const users = new Users(secret);
const weather = new Weather();
const unprotectedPaths = ['/', '/login', '/register'];
//Body parser, JSON prettifier, JWT validator
app.use(KoaBodyParser());
app.use(KoaJson());
app.use(KoaJwtValidator({ secret }).unless({ path: unprotectedPaths }));
/** Health check */
commonRouter.get('/', (ctx: Context) => ctx.body = 'OK');

// Install routers
app.use(users.router.routes()).use(users.router.allowedMethods());
app.use(weather.router.routes()).use(weather.router.allowedMethods());
app.use(commonRouter.routes()).use(commonRouter.allowedMethods());

app.use(async (ctx: Context, next: Next) => {
  try {
    await next();
  } catch (err) /* istanbul ignore next*/{
    ctx.status = err.status || 500;
    ctx.body = err.message;
    ctx.app.emit('error', err, ctx);
  }
});

app.on('error', (err, ctx: Context) => {
  console.error(err);
  setError(ctx, 500, 'Something broke!', err.message);
});

const server = app.listen(port, (): void => {
  console.info(`Koa listening on port ${port}`);
});

/* istanbul ignore next */
const cleanup = (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(function() {
      resolve();
    }, 1000);
  });
};

/* istanbul ignore next */
gracefulShutdown(server,
  {
    signals: 'SIGINT SIGTERM',
    timeout: 30000,
    development: false,
    onShutdown: cleanup,
    finally: function() {
      console.log('Server gracefulls shut down');
    }
  }
);
export default server;
