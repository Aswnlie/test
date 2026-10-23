import { assert, assertEquals, assertRejects } from "@std/assert";
import { eq, inArray } from "drizzle-orm";
import { closeDatabase, db } from "../db/client.ts";
import { ensureDemoUsers } from "../db/demo-users.ts";
import { users } from "../db/schema.ts";
import { compare, hash } from "../auth/passwords.ts";

Deno.test("demo users: create, repeat without changes, preserve different password", async () => {
  const prefix = `test_${crypto.randomUUID().replaceAll("-", "")}`;
  const names = [1, 2, 3].map((number) => `${prefix}_${number}`);
  const rollback = new Error("Roll back temporary seed test accounts");
  try {
    try {
      await db.transaction(async (tx) => {
        await ensureDemoUsers(tx, names);
        const first = await tx.select().from(users).where(
          inArray(users.username, names),
        );
        assertEquals(first.length, 3);
        for (const account of first) {
          assert(await compare("p455w0rd", account.passwordHash));
        }
        await ensureDemoUsers(tx, names);
        const second = await tx.select().from(users).where(
          inArray(users.username, names),
        );
        assertEquals(
          second.sort((a, b) => a.id - b.id),
          first.sort((a, b) => a.id - b.id),
        );
        const differentHash = await hash("a-different-password");
        await tx.update(users).set({ passwordHash: differentHash }).where(
          eq(users.username, names[0]),
        );
        await assertRejects(
          () => ensureDemoUsers(tx, names),
          Error,
          "different password",
        );
        const [unchanged] = await tx.select().from(users).where(
          eq(users.username, names[0]),
        );
        assertEquals(unchanged.passwordHash, differentHash);
        // cleanup test accounts
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
    assertEquals(
      (await db.select({ id: users.id }).from(users).where(
        inArray(users.username, names),
      )).length,
      0,
    );
  } finally {
    await closeDatabase();
  }
});
