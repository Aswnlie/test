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
  // load user before auth check
  app.use(loadUser);
  const accountRoutes = loginRouter();
  app.use(accountRoutes.routes());
  app.use(accountRoutes.allowedMethods());
  const router = registrationRouter();
  app.use(router.routes());
  app.use(router.allowedMethods());
  return app;
}
