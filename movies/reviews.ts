import { desc, eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { movies, reviews, users } from "../db/schema.ts";
import { markdownToHtml } from "../utils/markdown.ts";

export const maxReviewLength = 2000;

export type ReviewInput = { rating: number; content: string };

// Checks the submitted form on the server. Returns clean data or a readable error.
export function validateReview(
  form: URLSearchParams,
): ReviewInput | { error: string } {
  const rating = Number(form.get("rating"));
  const content = (form.get("content") ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Please choose a rating from 1 to 5." };
  }
  if (content.length === 0) {
    return { error: "Please write a review." };
  }
  if ([...content].length > maxReviewLength) {
    return { error: `Your review must be at most ${maxReviewLength} characters.` };
  }
  return { rating, content };
}

export async function movieExists(movieId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: movies.id })
    .from(movies)
    .where(eq(movies.id, movieId))
    .limit(1);
  return row !== undefined;
}

// The author comes from the session (userId), never from the form.
// The date and time are set by the database (created_at default).
export async function addReview(
  movieId: number,
  userId: number,
  input: ReviewInput,
): Promise<void> {
  await db.insert(reviews).values({
    movieId,
    userId,
    rating: input.rating,
    content: input.content,
  });
}

// Reviews of one movie, newest first, ready for the template.
export async function listReviews(movieId: number) {
  const rows = await db
    .select({
      rating: reviews.rating,
      content: reviews.content,
      createdAt: reviews.createdAt,
      username: users.username,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.movieId, movieId))
    .orderBy(desc(reviews.createdAt), desc(reviews.id));

  return rows.map((row) => ({
    rating: row.rating,
    username: row.username,
    createdAt: new Date(row.createdAt).toISOString().slice(0, 10),
    contentHtml: markdownToHtml(row.content),
  }));
}