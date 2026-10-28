import { movieRouter } from "./movies/home.ts";
import { loginRouter } from "./auth/login.ts";
import { type AuthState, loadUser } from "./auth/sessions.ts";
import { Application, isHttpError } from "@oak/oak";
import { registrationRouter } from "./auth/register.ts";

export function createApp(): Application<AuthState> {
  const app = new Application<AuthState>();
  // CSRF tokens reset on app restart
  app.keys = [crypto.randomUUID() + crypto.randomUUID()];
  app.use(async (ctx, next) => {
    ctx.response.headers.set("Cache-Control", "no-store");
    ctx.response.headers.set("X-Content-Type-Options", "nosniff");
    ctx.response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    try {
      await next();
    } catch (error) {
      ctx.response.status = isHttpError(error) ? error.status : 500;
      ctx.response.type = "text";
      ctx.response.body = isHttpError(error) && error.expose
        ? error.message
        : "Something went wrong. Please try again later.";
      // hide sensitive db details
      if (!isHttpError(error)) {
        console.error("Request failed with an internal error");
      }
    }
  });
  // Static files need no database session. Only expose these public folders.
  app.use(async (ctx, next) => {
    if (
      (ctx.request.method === "GET" || ctx.request.method === "HEAD") &&
      /^\/(css|js|images|uploads)\//.test(ctx.request.url.pathname)
    ) {
      await ctx.send({ root: `${Deno.cwd()}/public` });
      return;
    }
    await next();
  });
  // load user before auth check
  app.use(loadUser);
  const homeRoutes = movieRouter();
  app.use(homeRoutes.routes());
  app.use(homeRoutes.allowedMethods());
  const accountRoutes = loginRouter();
  app.use(accountRoutes.routes());
  app.use(accountRoutes.allowedMethods());
  const router = registrationRouter();
  app.use(router.routes());
  app.use(router.allowedMethods());
  return app;
}
