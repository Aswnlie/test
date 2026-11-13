import { assertEquals } from "@std/assert";
import { eq } from "drizzle-orm";
import { createApp } from "../app.ts";
import { closeDatabase, db } from "../db/client.ts";
import { googleAccounts, movies, reviews, sessions, users } from "../db/schema.ts";
import { randomToken } from "../auth/security.ts";
import { tokenHash } from "../auth/sessions.ts";

Deno.test("admin access follows the current database role", async () => {
  const app = createApp();
  const token = randomToken();
  const [user] = await db.insert(users).values({
    username: "test_" + randomToken().slice(0, 20),
    passwordHash: "unused",
  }).$returningId();
  async function status(cookie = "") {
    const res = await app.handle(
      new Request("http://localhost:8000/admin", { headers: { Cookie: cookie } }),
    );
    await res?.body?.cancel();
    return res?.status;
  }
  try {
    await db.insert(sessions).values({
      userId: user.id,
      tokenHash: await tokenHash(token),
      expiresAt: new Date(Date.now() + 60000),
    });
    const cookie = "movie_session=" + token;
    assertEquals(await status(), 303);
    assertEquals(await status(cookie), 403);
    await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
    assertEquals(await status(cookie), 200);
    await db.update(users).set({ role: "user" }).where(eq(users.id, user.id));
    assertEquals(await status(cookie), 403);
  } finally {
    await db.delete(users).where(eq(users.id, user.id));
    await closeDatabase();
  }
});

