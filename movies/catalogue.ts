import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.ts";
import { movies, reviews } from "../db/schema.ts";

export interface MovieCard {
  id: number;
  title: string;
  releaseYear: number;
  posterPath: string;
  createdDate: string;
  lastReviewDate: string | null;
}

export const catalogue = {
  async list(): Promise<MovieCard[]> {
    // One grouped query: movies without reviews are kept by LEFT JOIN.
    return await db.select({
      id: movies.id,
      title: movies.title,
      releaseYear: movies.releaseYear,
      posterPath: movies.posterPath,
      createdDate: sql<string>`DATE_FORMAT(${movies.createdAt}, '%Y-%m-%d')`,
      lastReviewDate: sql<string | null>`DATE_FORMAT(MAX(${reviews.createdAt}), '%Y-%m-%d')`,
    }).from(movies).leftJoin(reviews, eq(movies.id, reviews.movieId))
      .groupBy(movies.id, movies.title, movies.releaseYear, movies.posterPath, movies.createdAt)
      .orderBy(desc(movies.createdAt), desc(movies.id));
  },
  async remove(id: number): Promise<boolean> {
    // The existing foreign key also deletes this movie's reviews.
    const [result] = await db.delete(movies).where(eq(movies.id, id));
    return result.affectedRows > 0;
  },
};
