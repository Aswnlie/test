import { eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { movies, users } from "../db/schema.ts";
import { markdownToHtml } from "../utils/markdown.ts";
import { render } from "../views/render.ts";

type Page = { status: number; html: string };

function notFound(): Page {
  return {
    status: 404,
    html: render("movie", { title: "Movie not found", notFound: true }),
  };
}

export async function getMovieDetailsPage(
  idParam: string | undefined,
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
    status: 200,
    html: render("movie", {
      title: movie.title,
      director: movie.director,
      releaseYear: movie.releaseYear,
      posterPath: movie.posterPath,
      author: movie.author,
      addedOn: new Date(movie.createdAt).toISOString().slice(0, 10),
      descriptionHtml: markdownToHtml(movie.description),
    }),
  };
}
