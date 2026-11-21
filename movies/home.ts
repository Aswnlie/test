import { Router, type RouterContext } from "@oak/oak";
import type { AuthState } from "../auth/sessions.ts";
import { csrfToken, readForm, verifyCsrf } from "../auth/security.ts";
import { render } from "../views/render.ts";
import { catalogue, type MovieCard } from "./catalogue.ts";

// Роль загружается из базы вместе с текущей сессией.
export function isAdmin(user: AuthState["user"]): boolean {
  return user?.role === "admin";
}

// Подготавливаем постер и дату для карточки фильма.
export function cardData(movie: MovieCard) {
  const localPoster = /^\/uploads\/[a-zA-Z0-9_./-]+$/.test(movie.posterPath);
  const safePath = !movie.posterPath.split("/").includes("..");
  const posterPath = localPoster && safePath ? movie.posterPath : "/images/poster-placeholder.svg";

  return {
    ...movie,
    posterPath,
    date: movie.lastReviewDate ?? movie.createdDate,
    dateLabel: movie.lastReviewDate ? "Last review" : "Added",
  };
}

export function movieRouter(store = catalogue): Router<AuthState> {
  const router = new Router<AuthState>();
  // 1. Читаем фильмы из БД и передаём их в HTML-шаблон.
  router.get("/", async (ctx) => {
    const movies = (await store.list()).map(cardData);
    const user = ctx.state.user;

    ctx.response.type = "html";
    ctx.response.body = render("home", {
      title: "Movies",
      movies,
      user,
      isAdmin: isAdmin(user),
      csrf: user ? await csrfToken(ctx) : "",
      deleted: ctx.request.url.searchParams.get("deleted") === "1",
    });
  });

  // 2. Проверяем пользователя и CSRF, удаляем фильм и возвращаемся на главную.
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
