import { Router, type RouterContext } from "@oak/oak";
import type { AuthState } from "../auth/sessions.ts";
import { csrfToken, readForm, verifyCsrf } from "../auth/security.ts";
import { render } from "../views/render.ts";
import { catalogue, type MovieCard } from "./catalogue.ts";

// IDs come only from the server configuration, never from the browser.
export function isAdmin(user: AuthState["user"]): boolean {
  const ids = (Deno.env.get("ADMIN_USER_IDS") ?? "").split(",").map((id) => id.trim());
  return !!user && ids.includes(String(user.id));
}

export function cardData(movie: MovieCard) {
  return {
    ...movie,
    // Uploaded posters are served locally, in keeping with the app's CSP.
    posterPath: /^\/uploads\/[a-zA-Z0-9_./-]+$/.test(movie.posterPath) &&
        !movie.posterPath.split("/").includes("..")
      ? movie.posterPath
      : "/images/poster-placeholder.svg",
    date: movie.lastReviewDate ?? movie.createdDate,
    dateLabel: movie.lastReviewDate ? "Last review" : "Added",
  };
}

export function movieRouter(store = catalogue): Router<AuthState> {
  const router = new Router<AuthState>();
  router.get("/", async (ctx) => {
    const allMovies = (await store.list()).map(cardData);
    const query = (ctx.request.url.searchParams.get("q") ?? "").trim().slice(0, 100);
    const matches = allMovies.filter((movie) =>
      movie.title.toLowerCase().includes(query.toLowerCase())
    );
    const popular = [...allMovies].sort((a, b) => b.reviewCount - a.reviewCount)[0];
    const admin = isAdmin(ctx.state.user);
    ctx.response.type = "html";
    ctx.response.body = render("home", {
      title: "Home",
      user: ctx.state.user,
      csrf: ctx.state.user ? await csrfToken(ctx) : "",
      isAdmin: admin,
      movies: matches,
      query,
      count: matches.length,
      hasMovies: allMovies.length > 0,
      popular,
      recent: allMovies.filter((movie) => movie.id !== popular?.id).slice(0, 2),
      deleted: ctx.request.url.searchParams.get("deleted") === "1",
    });
  });

  router.post(
    "/movies/:id/delete",
    async (ctx: RouterContext<"/movies/:id/delete", { id: string }, AuthState>) => {
      ctx.assert(ctx.state.user, 401, "Please sign in first.");
      ctx.assert(isAdmin(ctx.state.user), 403, "Only administrators can delete movies.");
      const form = await readForm(ctx);
      await verifyCsrf(ctx, form);
      const id = Number(ctx.params.id);
      ctx.assert(
        /^\d+$/.test(ctx.params.id) && Number.isSafeInteger(id) && id > 0,
        400,
        "Invalid movie ID.",
      );
      ctx.assert(await store.remove(id), 404, "Movie not found.");
      ctx.response.status = 303;
      ctx.response.headers.set("Location", "/?deleted=1");
    },
  );
  return router;
}
