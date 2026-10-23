import { assert, assertEquals } from "@std/assert";
import { eq } from "drizzle-orm";
import { createApp } from "../app.ts";
import { closeDatabase, db } from "../db/client.ts";
import { sessions, users } from "../db/schema.ts";
import { hash } from "../auth/passwords.ts";
import { tokenHash } from "../auth/sessions.ts";

Deno.test("login: password, session rotation, expiry, restart and logout", async () => {
  const username = `test_${crypto.randomUUID().replaceAll("-", "")}`;
  const password = "Login-test-123";
  const app = createApp();
  const cookies = new Map<string, string>();
  let userId: number | undefined;
  const request = async (
    path: string,
    form?: Record<string, string>,
    application = app,
  ) => {
    const response = await application.handle(
      new Request(`http://localhost:8000${path}`, {
        method: form ? "POST" : "GET",
        headers: {
          Cookie: Array.from(cookies, ([key, value]) => `${key}=${value}`).join(
            "; ",
          ),
        },
        body: form ? new URLSearchParams(form) : undefined,
      }),
    );
    assert(response);
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const separator = pair.indexOf("=");
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    const text = await response.text();
    return { response, text };
  };
  try {
    const [created] = await db.insert(users).values({
      username,
      passwordHash: await hash(password),
    }).$returningId();
    userId = created.id;
    assertEquals((await request("/account")).response.status, 303);
    const login = await request("/login");
    assertEquals(login.response.status, 200);
    const csrf = login.text.match(/name="csrf" value="([a-f0-9]+)"/)?.[1];
    assert(csrf);
    assertEquals(
      (await request("/login", { username, password, csrf: "forged" })).response
        .status,
      403,
    );
    const wrong = await request("/login", {
      username,
      password: "wrong-password",
      csrf,
    });
    assertEquals(wrong.response.status, 401);
    const unknown = await request("/login", {
      username: "missing_test_account_123",
      password,
      csrf,
    });
    assertEquals(unknown.response.status, 401);
    assert(wrong.text.includes("Invalid username or password."));
    assert(unknown.text.includes("Invalid username or password."));
    const signedIn = await request("/login", { username, password, csrf });
    assertEquals(signedIn.response.status, 303);
    const sessionCookie = signedIn.response.headers.getSetCookie().find((
      value,
    ) => value.startsWith("movie_session="));
    assert(sessionCookie?.toLowerCase().includes("httponly"));
    assert(sessionCookie?.toLowerCase().includes("samesite=lax"));
    const firstToken = cookies.get("movie_session")!;
    const [session] = await db.select().from(sessions).where(
      eq(sessions.userId, userId),
    );
    assertEquals(session.tokenHash, await tokenHash(firstToken));
    assert(session.tokenHash !== firstToken);
    assert((await request("/account")).text.includes(username));
    cookies.set("movie_session", "0".repeat(64));
    assertEquals((await request("/account")).response.status, 303);
    cookies.set("movie_session", firstToken);
    assertEquals(
      (await request("/login", { username, password, csrf })).response.status,
      303,
    );
    const secondToken = cookies.get("movie_session")!;
    assert(secondToken !== firstToken);
    assertEquals(
      (await db.select().from(sessions).where(
        eq(sessions.tokenHash, await tokenHash(firstToken)),
      )).length,
      0,
    );
    // keep sessions on app restart
    const restartedApp = createApp();
    const account = await request("/account", undefined, restartedApp);
    assertEquals(account.response.status, 200);
    const newCsrf = account.text.match(/name="csrf" value="([a-f0-9]+)"/)?.[1];
    assert(newCsrf);
    assertEquals(
      (await request("/logout", { csrf: "forged" }, restartedApp)).response
        .status,
      403,
    );
    assertEquals(
      (await request("/logout", { csrf: newCsrf }, restartedApp)).response
        .status,
      303,
    );
    assertEquals(
      (await db.select().from(sessions).where(eq(sessions.userId, userId)))
        .length,
      0,
    );
    cookies.set("movie_session", secondToken);
    assertEquals(
      (await request("/account", undefined, restartedApp)).response.status,
      303,
    );
    await db.insert(sessions).values({
      tokenHash: await tokenHash(secondToken),
      userId,
      expiresAt: new Date(Date.now() - 60_000),
    });
    assertEquals(
      (await request("/account", undefined, restartedApp)).response.status,
      303,
    );
    assertEquals(
      (await request("/logout", undefined, restartedApp)).response.status,
      405,
    );
  } finally {
    if (userId !== undefined) {
      await db.delete(sessions).where(eq(sessions.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
    await closeDatabase();
  }
});
