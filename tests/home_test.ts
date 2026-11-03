import { assert, assertEquals } from "@std/assert";
import { Application, isHttpError } from "@oak/oak";
import type { AuthState } from "../auth/sessions.ts";
import { cardData, movieRouter } from "../movies/home.ts";
import type { MovieCard } from "../movies/catalogue.ts";

const movie: MovieCard = {
  id: 1,
  title: '<script>alert("x")</script>',
  releaseYear: 2025,
  posterPath: "/uploads/poster.jpg",
  createdDate: "2026-01-02",
  lastReviewDate: null,
};

Deno.test("movie API: dates, empty list and admin delete protection", async () => {
  const previous = Deno.env.get("ADMIN_USER_IDS");
  Deno.env.set("ADMIN_USER_IDS", "7");
  let activeUser: AuthState["user"];
  let rows = [movie, {
    ...movie,
    id: 2,
    title: "F1",
    lastReviewDate: "2026-10-28",
  }];
  const removed: number[] = [];
  const store = {
    list: () => Promise.resolve(rows),
    remove: (id: number) => {
      removed.push(id);
      return Promise.resolve(id === 1);
    },
  };
  const app = new Application<AuthState>();
  app.keys = ["test-signing-key"];
  app.use(async (ctx, next) => {
    ctx.state.user = activeUser;
    try {
      await next();
    } catch (error) {
      if (!isHttpError(error)) throw error;
      ctx.response.status = error.status;
      ctx.response.body = error.message;
    }
  });
  const router = movieRouter(store);
  app.use(router.routes());
  app.use(router.allowedMethods());
  const cookies = new Map<string, string>();
  async function request(path: string, form?: Record<string, string>, origin = "http://localhost") {
    const response = await app.handle(
      new Request(`http://localhost${path}`, {
        method: form ? "POST" : "GET",
        headers: { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "), origin },
        body: form ? new URLSearchParams(form) : undefined,
      }),
    );
    assert(response);
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0];
      const index = pair.indexOf("=");
      cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
    return { status: response.status, headers: response.headers, text: await response.text() };
  }
  try {
    const page = await request("/");
    assertEquals(page.status, 200);
    assert(page.text.includes('id="movie-card"'));
    const guest = await request("/api/movies");
    assertEquals(guest.status, 200);
    assert(guest.headers.get("content-type")?.includes("application/json"));
    const data = JSON.parse(guest.text);
    assertEquals(data.movies[0].date, "2026-01-02");
    assertEquals(data.movies[0].dateLabel, "Added");
    assertEquals(data.movies[1].date, "2026-10-28");
    assertEquals(data.movies[1].dateLabel, "Last review");
    assertEquals(data.movies[0].title, movie.title);
    assertEquals(data.isAdmin, false);
    assertEquals(data.csrf, "");
    assertEquals((await request("/api/movies/1/delete", { csrf: "fake" })).status, 401);
    activeUser = { id: 8, username: "regular" };
    assertEquals(JSON.parse((await request("/api/movies")).text).isAdmin, false);
    assertEquals((await request("/api/movies/1/delete", { csrf: "fake" })).status, 403);
    activeUser = { id: 7, username: "admin" };
    const admin = JSON.parse((await request("/api/movies")).text);
    assertEquals(admin.isAdmin, true);
    const csrf = admin.csrf;
    assert(/^[a-f0-9]{64}$/.test(csrf));
    assertEquals((await request("/api/movies/1/delete", { csrf: "fake" })).status, 403);
    assertEquals(
      (await request("/api/movies/1/delete", { csrf }, "https://evil.example")).status,
      403,
    );
    assertEquals((await request("/api/movies/invalid/delete", { csrf })).status, 400);
    assertEquals(removed.length, 0);
    const deleted = await request("/api/movies/1/delete", { csrf });
    assertEquals(deleted.status, 200);
    assertEquals(JSON.parse(deleted.text).message, "Movie and its reviews deleted.");
    assertEquals(removed, [1]);
    assertEquals((await request("/api/movies/999/delete", { csrf })).status, 404);
    assertEquals((await request("/api/movies/1/delete")).status, 405);
    rows = [];
    assertEquals(JSON.parse((await request("/api/movies")).text).movies, []);
    Deno.env.delete("ADMIN_USER_IDS");
    assertEquals((await request("/api/movies/1/delete", { csrf })).status, 403);
    assertEquals(cardData(movie).date, "2026-01-02");
    assertEquals(
      cardData({ ...movie, posterPath: "javascript:alert(1)" }).posterPath,
      "/images/poster-placeholder.svg",
    );
    assertEquals(
      cardData({ ...movie, posterPath: "/uploads/../secret" }).posterPath,
      "/images/poster-placeholder.svg",
    );
  } finally {
    if (previous === undefined) Deno.env.delete("ADMIN_USER_IDS");
    else Deno.env.set("ADMIN_USER_IDS", previous);
  }
});
