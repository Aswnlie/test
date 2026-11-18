import { type Context, Router } from "@oak/oak";
import { db } from "../db/client.ts";
import { movies } from "../db/schema.ts";
import { csrfToken, verifyCsrf } from "../auth/security.ts";
import { type AuthState, requireUser } from "../auth/sessions.ts";
import { render } from "../views/render.ts";
import {
  detectImageType,
  MAX_POSTER_BYTES,
  MIN_YEAR,
  validateFields,
} from "./add-validation.ts";

const uploadDir = "public/uploads";
// Poster limit plus room for the text fields and form overhead.
const maxRequestBytes = MAX_POSTER_BYTES + 100 * 1024;

// Tiny browser script: shows the slider's year next to its label.
const yearSliderScript = `
const slider = document.querySelector("#releaseYear");
const output = document.querySelector("#year-output");
if (slider && output) {
  const update = () => { output.textContent = slider.value; };
  slider.addEventListener("input", update);
  update();
}
`;

interface FormValues {
  title: string;
  director: string;
  releaseYear: string;
  description: string;
}

// Shows the form again, with the user's text and any error messages.
async function showForm(
  ctx: Context<AuthState>,
  status: number,
  values: Partial<FormValues>,
  errors: string[] = [],
) {
  const maxYear = new Date().getFullYear();
  ctx.response.status = status;
  ctx.response.type = "html";
  ctx.response.body = render("add-movie", {
    title: "Add a movie",
    user: ctx.state.user,
    csrf: await csrfToken(ctx),
    minYear: MIN_YEAR,
    maxYear,
    errors: errors.length ? errors : undefined,
    values: { releaseYear: String(maxYear), ...values },
  });
}

export function addMovieRouter(): Router<AuthState> {
  const router = new Router<AuthState>();

  router.get("/movies/add/year-slider.js", (ctx) => {
    ctx.response.type = "text/javascript";
    ctx.response.body = yearSliderScript;
  });

  router.get("/movies/add", requireUser, async (ctx) => {
    await showForm(ctx, 200, {});
  });

  router.post("/movies/add", requireUser, async (ctx) => {
    // 1. Basic request checks before reading the body.
    const type = ctx.request.headers.get("content-type") ?? "";
    ctx.assert(type.startsWith("multipart/form-data"), 415, "Unsupported form format");
    const length = Number(ctx.request.headers.get("content-length"));
    ctx.assert(
      Number.isFinite(length) && length > 0 && length <= maxRequestBytes,
      413,
      "The upload is too large. The poster limit is 2 MB.",
    );

    // 2. Read the form and check the CSRF token.
    let form: FormData;
    try {
      form = await ctx.request.body.formData();
    } catch {
      ctx.throw(400, "The form could not be read.");
    }
    await verifyCsrf(ctx, new URLSearchParams({ csrf: String(form.get("csrf") ?? "") }));

    // 3. Collect the text fields.
    const values: FormValues = {
      title: String(form.get("title") ?? "").trim(),
      director: String(form.get("director") ?? "").trim(),
      releaseYear: String(form.get("releaseYear") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
    };
    const errors = validateFields(values);

    // 4. Check the poster.
    const poster = form.get("poster");
    let bytes = new Uint8Array();
    let extension: string | null = null;
    if (!(poster instanceof File) || poster.size === 0) {
      errors.push("Choose a poster image.");
    } else if (poster.size > MAX_POSTER_BYTES) {
      errors.push("The poster must be 2 MB or smaller.");
    } else {
      bytes = new Uint8Array(await poster.arrayBuffer());
      extension = detectImageType(bytes);
      if (!extension) errors.push("The poster must be a PNG, JPEG or WebP image.");
    }

    if (errors.length) {
      await showForm(ctx, 422, values, errors);
      return;
    }

    // 5. Save the poster under a random name, then the movie record.
    await Deno.mkdir(uploadDir, { recursive: true });
    const fileName = `${crypto.randomUUID()}.${extension}`;
    const filePath = `${uploadDir}/${fileName}`;
    await Deno.writeFile(filePath, bytes, { createNew: true });
    try {
      await db.insert(movies).values({
        title: values.title,
        director: values.director,
        releaseYear: Number(values.releaseYear),
        description: values.description,
        posterPath: `/uploads/${fileName}`,
        userId: ctx.state.user!.id, // always from the session, never from the form
      });
    } catch (error) {
      await Deno.remove(filePath).catch(() => {}); // don't leave an orphan file
      throw error;
    }

    ctx.response.status = 303;
    ctx.response.headers.set("Location", "/");
  });

  return router;
}