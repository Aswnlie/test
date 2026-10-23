import { eq, sql } from "drizzle-orm";
import { compare, hash } from "../auth/passwords.ts";
import { db } from "./client.ts";
import { users } from "./schema.ts";

export const demoUsernames = ["user1", "user2", "user3"] as const;
// create assignment accounts only
const demoPassword = "p455w0rd";
type Database = Pick<typeof db, "select" | "insert">;

export async function ensureDemoUsers(
  database: Database,
  usernames: readonly string[] = demoUsernames,
): Promise<string[]> {
  const results: string[] = [];
  for (const username of usernames) {
    const [existing] = await database.select({ id: users.id }).from(users)
      .where(eq(users.username, username)).limit(1);
    if (!existing) {
      await database.insert(users).values({
        username,
        passwordHash: await hash(demoPassword),
      }).onDuplicateKeyUpdate({
        // skip if account already exists
        set: { id: sql`${users.id}` },
      });
    }
    const [account] = await database.select({
      passwordHash: users.passwordHash,
    })
      .from(users).where(eq(users.username, username)).limit(1);
    if (!account || !await compare(demoPassword, account.passwordHash)) {
      throw new Error(
        `Demo account ${username} has a different password. No existing password was changed.`,
      );
    }
    results.push(`${username}: ready`);
  }
  return results;
}
