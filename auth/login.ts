import { type Context, Router } from "@oak/oak";
import { eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { users } from "../db/schema.ts";
import { compare, hash } from "./passwords.ts";
import {
  type Attempts,
  checkAttempts,
  csrfToken,
  readForm,
  validPassword,
  validUsername,
  verifyCsrf,
} from "./security.ts";
import { type AuthState, endSession, requireUser, startSession } from "./sessions.ts";
import { render } from "../views/render.ts";

// run bcrypt even when the username does not exist
const dummyHash = await hash(crypto.randomUUID());

export function loginRouter(): Router<AuthState> {
  const router = new Router<AuthState>();
  const attempts: Attempts = new Map();
  router.get("/login", async (ctx) => {
    if (ctx.state.user) {
      ctx.response.redirect("/account");
      return;
    }
    ctx.response.type = "html";
    ctx.response.body = render("login", {
      title: "Sign in",
      csrf: await csrfToken(ctx),
    });
  });
  router.post("/login", async (ctx: Context<AuthState>) => {
    checkAttempts(ctx, attempts);
    const form = await readForm(ctx);
    await verifyCsrf(ctx, form);
    const username = (form.get("username") ?? "").trim().toLowerCase();
    const password = form.get("password") ?? "";
    const validInput = validUsername(username) && validPassword(password);
    let user: typeof users.$inferSelect | undefined;
    let checkPassword = "invalid";
    if (validInput) {
      const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
      user = rows[0];
      checkPassword = password;
    }
    const matches = await compare(checkPassword, user?.passwordHash ?? dummyHash);
    // use the same error for unknown users and wrong passwords
    if (!user || !matches) {
      ctx.response.status = 401;
      ctx.response.type = "html";
      ctx.response.body = render("login", {
        title: "Sign in",
        username,
        csrf: await csrfToken(ctx),
        error: "Invalid username or password.",
      });
      return;
    }
    await startSession(ctx, user.id);
    ctx.response.status = 303;
    ctx.response.headers.set("Location", "/account");
  });
  router.get("/account", requireUser, async (ctx) => {
    ctx.response.type = "html";
    ctx.response.body = render("account", {
      title: "Your account",
      user: ctx.state.user,
      csrf: await csrfToken(ctx),
    });
  });
  router.post("/logout", async (ctx) => {
    const form = await readForm(ctx);
    await verifyCsrf(ctx, form);
    await endSession(ctx);
    ctx.response.status = 303;
    ctx.response.headers.set("Location", "/login");
  });
  return router;
}
