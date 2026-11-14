import { and, eq, inArray } from "drizzle-orm";
import { closeDatabase, db } from "../db/client.ts";
import { movies, users } from "../db/schema.ts";

const POSTER_PATH = "/uploads/seed-placeholder.svg";

const seedMovies = [
  {
    username: "user1",
    title: "Casablanca",
    director: "Michael Curtiz",
    releaseYear: 1942,
    addedOn: "2026-09-12",
    description: `**Casablanca** is set in Morocco during World War II.

Rick Blaine, an American café owner, is pulled back into his past when Ilsa Lund arrives with her husband, a resistance leader.

- Classic romance and wartime drama
- Famous for its dialogue and music

A must-see for fans of *golden age* cinema.`,
  },
  {
    username: "user1",
    title: "Inception",
    director: "Christopher Nolan",
    releaseYear: 2010,
    addedOn: "2026-09-18",
    description: `**Inception** follows a team of thieves who enter people's dreams to steal or plant ideas.

- Layered dreams within dreams
- Strong cast led by Leonardo DiCaprio

More details on [Wikipedia](https://en.wikipedia.org/wiki/Inception).`,
  },
  {
    username: "user2",
    title: "Spirited Away",
    director: "Hayao Miyazaki",
    releaseYear: 2001,
    addedOn: "2026-09-25",
    description: `**Spirited Away** follows ten-year-old Chihiro, who wanders into a world of spirits and must work in a bathhouse to free her parents.

- Animated fantasy from Studio Ghibli
- Winner of the Academy Award for Best Animated Feature

Visually stunning and full of *imagination*.`,
  },
  {
    username: "user2",
    title: "The Godfather",
    director: "Francis Ford Coppola",
    releaseYear: 1972,
    addedOn: "2026-10-02",
    description: `**The Godfather** tells the story of the Corleone crime family in New York.

When the patriarch Vito is attacked, his youngest son Michael is drawn into the family business.

1. Power and loyalty
2. Family and betrayal
3. A slow, serious tone`,
  },
  {
    username: "user3",
    title: "Parasite",
    director: "Bong Joon-ho",
    releaseYear: 2019,
    addedOn: "2026-10-09",
    description: `**Parasite** is a dark comedy thriller about the poor Kim family, who slowly work their way into the household of the wealthy Park family.

- Winner of the Academy Award for Best Picture
- Sharp commentary on social class

> Funny, tense and unpredictable.`,
  },
];

try {
  const messages = await db.transaction(async (tx) => {
    const accounts = await tx
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(inArray(users.username, ["user1", "user2", "user3"]));
    const idByUsername = new Map(accounts.map((a) => [a.username, a.id]));
    const results: string[] = [];

    for (const movie of seedMovies) {
      const userId = idByUsername.get(movie.username);
      if (userId === undefined) {
        throw new Error(
          `Seed account ${movie.username} is missing. Run scripts/seed-users.ts first.`,
        );
      }

      const [existing] = await tx
        .select({ id: movies.id })
        .from(movies)
        .where(and(eq(movies.title, movie.title), eq(movies.userId, userId)))
        .limit(1);

      if (existing) {
        results.push(`Movie "${movie.title}" already exists (id ${existing.id}).`);
        continue;
      }

      await tx.insert(movies).values({
        title: movie.title,
        director: movie.director,
        releaseYear: movie.releaseYear,
        description: movie.description,
        posterPath: POSTER_PATH,
        userId,
        createdAt: new Date(`${movie.addedOn}T12:00:00Z`),
      });
      results.push(`Movie "${movie.title}" added for ${movie.username}.`);
    }

    return results;
  });

  for (const message of messages) console.log(message);
  console.log("Seed movies are ready. Existing movies were preserved.");
} catch (error) {
  if (error instanceof Error && error.message.startsWith("Seed account ")) {
    console.error(error.message);
  } else {
    console.error("Could not seed movies. Check MySQL, .env and migrations.");
  }
  Deno.exitCode = 1;
} finally {
  await closeDatabase();
}
