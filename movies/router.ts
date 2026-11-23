import { type Context, Router } from "@oak/oak";
import { readForm, verifyCsrf } from "../auth/security.ts";
import { type AuthState, requireUser } from "../auth/sessions.ts";
import { getMovieDetailsPage } from "./details.ts";
import { addReview, movieExists, validateReview } from "./reviews.ts";

function sendPage(ctx: Context<AuthState>, page: { status: number; html: string }) {
  ctx.response.status = page.status;
  ctx.response.type = "html";
  ctx.response.body = page.html;
}

export function movieRouter(): Router<AuthState> {
  const router = new Router<AuthState>();

  router.get("/movie/:id", async (ctx) => {
    sendPage(ctx, await getMovieDetailsPage(ctx, ctx.params.id));
  });

  // Order matters: logged in -> CSRF -> movie exists -> valid input -> save.
  router.post("/movie/:id/review", requireUser, async (ctx) => {
    const userId = ctx.state.user?.id;
    if (userId === undefined) {
      ctx.response.status = 401;
      ctx.response.body = "Please sign in";
      return;
    }

    const form = await readForm(ctx);
    await verifyCsrf(ctx, form);

    const movieId = Number(ctx.params.id);
    if (!Number.isInteger(movieId) || movieId < 1 || !(await movieExists(movieId))) {
      sendPage(ctx, await getMovieDetailsPage(ctx, ctx.params.id)); // 404 page
      return;
    }

    const review = validateReview(form);
    if ("error" in review) {
      sendPage(
        ctx,
        await getMovieDetailsPage(ctx, ctx.params.id, {
          error: review.error,
          content: form.get("content") ?? "",
        }),
      );
      return;
    }

    await addReview(movieId, userId, review);
    ctx.response.status = 303;
    ctx.response.headers.set("Location", `/movie/${movieId}`);
  });

  return router;
}
