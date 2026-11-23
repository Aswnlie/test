import type { Context } from "@oak/oak";
import { eq } from "drizzle-orm";
import { csrfToken } from "../auth/security.ts";
import type { AuthState } from "../auth/sessions.ts";
import { db } from "../db/client.ts";
import { movies, users } from "../db/schema.ts";
import { markdownToHtml } from "../utils/markdown.ts";
import { render } from "../views/render.ts";
import { listReviews } from "./reviews.ts";

type Page = { status: number; html: string };

// Filled in when the review form was rejected, so the page can show the error
// and keep the text the user already typed.
type ReviewForm = { error?: string; content?: string };

function notFound(): Page {
  return {
    status: 404,
    html: render("movie", { title: "Movie not found", notFound: true }),
  };
}

export async function getMovieDetailsPage(
  ctx: Context<AuthState>,
  idParam: string | undefined,
  review: ReviewForm = {},
): Promise<Page> {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) return notFound();

  const [movie] = await db
    .select({
      title: movies.title,
      director: movies.director,
      releaseYear: movies.releaseYear,
      description: movies.description,
      posterPath: movies.posterPath,
      createdAt: movies.createdAt,
      author: users.username,
    })
    .from(movies)
    .innerJoin(users, eq(movies.userId, users.id))
    .where(eq(movies.id, id))
    .limit(1);

  if (!movie) return notFound();

  return {
    status: review.error ? 400 : 200,
    html: render("movie", {
      id,
      title: movie.title,
      director: movie.director,
      releaseYear: movie.releaseYear,
      posterPath: movie.posterPath,
      author: movie.author,
      addedOn: new Date(movie.createdAt).toISOString().slice(0, 10),
      descriptionHtml: markdownToHtml(movie.description),
      user: ctx.state.user,
      csrf: ctx.state.user ? await csrfToken(ctx) : undefined,
      reviews: await listReviews(id),
      reviewError: review.error,
      reviewContent: review.content,
    }),
  };
}