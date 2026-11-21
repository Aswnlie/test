import { assertEquals, assertStringIncludes } from "@std/assert";
import { Application } from "@oak/oak";
import { createApp } from "../app.ts";
import { registrationRouter } from "../auth/register.ts";
import type { AuthState } from "../auth/sessions.ts";

Deno.test("combined app serves shared assets and Google links without database access", async () => {
  const app = createApp();
  for (
    const path of [
      "/login",
      "/register",
      "/css/style.css",
      "/js/home.js",
      "/images/poster-placeholder.svg",
    ]
  ) {
    const response = await app.handle(new Request(`http://localhost:8000${path}`));
    assertEquals(response?.status, 200);
    const body = await response!.text();
    if (path === "/login" || path === "/register") {
      assertStringIncludes(body, 'href="/auth/google"');
      assertStringIncludes(body, 'href="/css/style.css"');
      assertStringIncludes(body, 'href="/"');
    }
  }
});

Deno.test("signed-in users visiting registration return to their account", async () => {
  const app = new Application<AuthState>();
  app.use(async (ctx, next) => {
    ctx.state.user = { id: 1, username: "member", role: "user" };
    await next();
  });
  app.use(registrationRouter().routes());
  for (const path of ["/register", "/register/success"]) {
    const response = await app.handle(new Request(`http://localhost:8000${path}`));
    assertEquals(response?.status, 303);
    assertEquals(response?.headers.get("Location"), "/account");
    await response?.body?.cancel();
  }
});
