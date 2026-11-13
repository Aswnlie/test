import { assertEquals } from "@std/assert";
import { eq } from "drizzle-orm";
import { createApp } from "../app.ts";
import { closeDatabase, db } from "../db/client.ts";
import { googleAccounts, movies, reviews, sessions, users } from "../db/schema.ts";
import { randomToken } from "../auth/security.ts";
import { tokenHash } from "../auth/sessions.ts";

Deno.test("deleting a user cascades to their movie, reviews and auth records", async () => {
  const rollback = new Error("rollback test data");
  try {
    await db.transaction(async (tx) => {
      const [owner] = await tx.insert(users).values({
        username: "test_" + randomToken().slice(0, 20),
        passwordHash: "unused",
      }).$returningId();
      const [other] = await tx.insert(users).values({
        username: "test_" + randomToken().slice(0, 20),
        passwordHash: "unused",
      }).$returningId();
      const [movie] = await tx.insert(movies).values({
        title: "Cascade test",
        director: "Test",
        releaseYear: 2000,
        description: "Test",
        posterPath: "test.png",
        userId: owner.id,
      }).$returningId();
      const [review] = await tx.insert(reviews).values({
        movieId: movie.id,
        userId: other.id,
        rating: 3,
        content: "Test",
      }).$returningId();
      const digest = await tokenHash(randomToken());
      await tx.insert(sessions).values({
        userId: owner.id,
        tokenHash: digest,
        expiresAt: new Date(),
      });
      await tx.insert(googleAccounts).values({ subject: randomToken(), userId: owner.id });
      await tx.delete(users).where(eq(users.id, owner.id));
      assertEquals((await tx.select().from(movies).where(eq(movies.id, movie.id))).length, 0);
      assertEquals((await tx.select().from(reviews).where(eq(reviews.id, review.id))).length, 0);
      assertEquals(
        (await tx.select().from(sessions).where(eq(sessions.tokenHash, digest))).length,
        0,
      );
      assertEquals(
        (await tx.select().from(googleAccounts).where(eq(googleAccounts.userId, owner.id))).length,
        0,
      );
      assertEquals((await tx.select().from(users).where(eq(users.id, other.id))).length, 1);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await closeDatabase();
  }
});
