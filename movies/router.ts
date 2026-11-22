import { Router } from "@oak/oak";
import type { AuthState } from "../auth/sessions.ts";
import { getMovieDetailsPage } from "./details.ts";

export function movieRouter(): Router<AuthState> {
  const router = new Router<AuthState>();

  router.get("/movie/:id", async (ctx) => {
    const page = await getMovieDetailsPage(ctx.params.id);
    ctx.response.status = page.status;
    ctx.response.type = "html";
    ctx.response.body = page.html;
  });

  return router;
}
