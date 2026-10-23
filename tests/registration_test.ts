import { assert, assertEquals } from "@std/assert";
import { eq } from "drizzle-orm";
import { createApp } from "../app.ts";
import { closeDatabase, db } from "../db/client.ts";
import { users } from "../db/schema.ts";
import { compare } from "../auth/passwords.ts";

Deno.test("registration: validation, CSRF, hashing, duplicate and rate limit", async () => {
  const app = createApp();
  const username = `test_${crypto.randomUUID().replaceAll("-", "")}`;
  const password = "Registration-test-123";
  const url = "http://localhost:8000/register";
  try {
    const page = await app.handle(new Request(url));
    assert(page);
    assertEquals(page.status, 200);
    const html = await page.text();
    const csrf = html.match(/name="csrf" value="([a-f0-9]+)"/)?.[1];
    assert(csrf);
    const cookie = page.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    assert(cookie.includes("registration_csrf.sig="));

    const submit = async (
      fields: Record<string, string>,
      origin = "http://localhost:8000",
    ) => {
      const response = await app.handle(
        new Request(url, {
          method: "POST",
          headers: { Cookie: cookie, Origin: origin },
          body: new URLSearchParams({
            csrf: csrf!,
            username,
            password,
            confirmPassword: password,
            ...fields,
          }),
        }),
      );
      assert(response);
      const text = await response.text();
      return { response, text };
    };

    assertEquals((await submit({ csrf: "forged" })).response.status, 403);
    assertEquals(
      (await submit({}, "https://attacker.invalid")).response.status,
      403,
    );
    const invalid = await submit({
      username: '<script>alert("x")</script>',
      password: "short",
    });
    assertEquals(invalid.response.status, 422);
    assert(!invalid.text.includes('<script>alert("x")</script>'));
    assert(!invalid.text.includes('value="short"'));
    assertEquals(
      (await submit({
        password: "é".repeat(37),
        confirmPassword: "é".repeat(37),
      })).response.status,
      422,
    );
    assertEquals(
      (await submit({ confirmPassword: "different-password" })).response.status,
      422,
    );
    const created = await submit({ username: username.toUpperCase() });
    assertEquals(created.response.status, 303);
    assertEquals(created.response.headers.get("Location"), "/register/success");

    const [user] = await db.select().from(users).where(
      eq(users.username, username),
    );
    assert(user);
    assert(user.passwordHash !== password);
    assert(await compare(password, user.passwordHash));
    assertEquals(await compare("wrong-password", user.passwordHash), false);
    assertEquals((await submit({})).response.status, 422);
    const [stillOne] = await db.select({ id: users.id }).from(users).where(
      eq(users.username, username),
    );
    assertEquals(stillOne.id, user.id);
    for (let i = 0; i < 4; i++) {
      const result = await submit({ csrf: "forged" });
      assertEquals(result.response.status, i === 3 ? 429 : 403);
    }
  } finally {
    await db.delete(users).where(eq(users.username, username));
    await closeDatabase();
  }
});
