import {
  type Attempts,
  checkAttempts,
  csrfToken,
  readForm,
  validPassword,
  validUsername,
  verifyCsrf,
} from "./security.ts";
import { type Context, Router } from "@oak/oak";
import { db } from "../db/client.ts";
import { users } from "../db/schema.ts";
import { hash } from "./passwords.ts";
import { render } from "../views/render.ts";

const csrfCookie = "registration_csrf";

function duplicateUsername(error: unknown): boolean {
  // handling mysql wrapper
  while (error && typeof error === "object") {
    if ("code" in error && error.code === "ER_DUP_ENTRY") return true;
    if (!("cause" in error)) return false;
    error = error.cause;
  }
  return false;
}

export function registrationRouter(): Router {
  const router = new Router();
  const attempts: Attempts = new Map();

  router.get("/register", async (ctx) => {
    ctx.response.type = "html";
    ctx.response.body = render("register", {
      title: "Register",
      csrf: await csrfToken(ctx, csrfCookie, "/register"),
      username: "",
    });
  });

  router.post("/register", async (ctx: Context) => {
    checkAttempts(ctx, attempts);
    const form = await readForm(ctx);
    await verifyCsrf(ctx, form, csrfCookie);
    const token = await csrfToken(ctx, csrfCookie, "/register");

    const username = (form.get("username") ?? "").trim().toLowerCase();
    // Do not trim passwords because spaces can be part of them
    const password = form.get("password") ?? "";
    const errors: string[] = [];
    if (!validUsername(username)) {
      errors.push(
        "Username must contain 3–50 letters, numbers or underscores.",
      );
    }
    if (!validPassword(password)) {
      errors.push(
        "Password must contain at least 8 characters and at most 72 UTF-8 bytes.",
      );
    }
    if (password !== form.get("confirmPassword")) {
      errors.push("Passwords do not match.");
    }
    if (!errors.length) {
      try {
        await db.insert(users).values({
          username,
          passwordHash: await hash(password),
        });
      } catch (error) {
        if (!duplicateUsername(error)) throw error;
        errors.push("This username is already taken.");
      }
    }
    if (errors.length) {
      ctx.response.status = 422;
      ctx.response.type = "html";
      ctx.response.body = render("register", {
        title: "Register",
        csrf: token,
        username,
        errors,
      });
      return;
    }
    ctx.response.status = 303;
    ctx.response.headers.set("Location", "/register/success");
  });

  router.get("/register/success", (ctx) => {
    ctx.response.type = "html";
    ctx.response.body = render("registered", { title: "Account created" });
  });
  return router;
}
