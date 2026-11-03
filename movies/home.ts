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
    ctx.response.type = "html";
    ctx.response.body = render("home", {
      title: "Movies",
      user: ctx.state.user,
      csrf: ctx.state.user ? await csrfToken(ctx) : "",
    });
  });

  router.get("/api/movies", async (ctx) => {
    const admin = isAdmin(ctx.state.user);
    ctx.response.body = {
      movies: (await store.list()).map(cardData),
      isAdmin: admin,
      csrf: admin ? await csrfToken(ctx) : "",
    };
  });

  router.post(
    "/api/movies/:id/delete",
    async (ctx: RouterContext<"/api/movies/:id/delete", { id: string }, AuthState>) => {
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
      ctx.response.body = { message: "Movie and its reviews deleted." };
    },
  );
  return router;
}
