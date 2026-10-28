# Movie Reviews

Group project for Coventry University. We are building a website where users can add movies and
write reviews.

This branch contains the Zhanel Assilbek's work: the database, registration, login, sessions and demo
accounts. The movie pages, review forms and shared styling are being developed by the other team
members.

## Run locally

You need Deno and a local MySQL server.

1. Create a MySQL database and a user with access to it.
2. Copy `.env.example` to `.env` and fill in your database details.
3. Run these commands from the project folder:

```sh
deno install
deno task db:migrate
deno task db:seed-users
deno task db:check
deno task start
```

Open http://localhost:8000/register to create an account, or http://localhost:8000/login to sign in.
After login, `/account` shows the signed-in user. Stop the server with Ctrl+C.

The assignment accounts are `user1`, `user2` and `user3`. All three use the password `p455w0rd`.
Each team member needs to run `db:seed-users` on their own database. Running it again keeps existing
accounts unchanged. If an account has a different password, the script stops instead of resetting
it.

Keep `.env` local; it is excluded from Git. Use the example file to share the required variable
names.

## What is included

- MySQL tables for users, movies, reviews and sessions, with foreign keys.
- Registration with username validation, password confirmation and bcrypt hashes.
- Login, logout and sessions that expire after seven days. The database stores a hash of each
  session token.
- A protected account page and middleware for protecting other routes.
- CSRF checks, form size limits and a limit of ten registration or login attempts per IP per minute.

Usernames use 3–50 letters, numbers or underscores and are saved in lowercase. Passwords need at
least eight characters and must fit within bcrypt’s 72-byte limit.

The current server runs on `127.0.0.1:8000`. Rate limits are stored in memory and reset when the app
restarts. Reload open forms after a restart, since their CSRF cookies will no longer be valid.
Public hosting will need HTTPS and a shared rate limiter.

## Tests

Run against a development database configured in `.env`:

```sh
deno task test:auth
```

The tests cover registration, password checks, session expiry and rotation, logout, CSRF and
repeatable demo account creation. Temporary test data is cleaned up afterwards; the existing demo
accounts are left alone.

To run just the registration test:

```sh
deno task test:registration
```

## Notes for the team

Use the shared database client rather than opening a new connection for each request:

```ts
import { db } from "./db/client.ts";
import { movies } from "./db/schema.ts";

const catalogue = await db.select().from(movies);
```

Adjust the import paths for your folder. The pool uses up to five connections, and database dates
are stored and read as UTC. Standalone scripts should call `closeDatabase()` in a `finally` block.

After editing `db/schema.ts`, run `deno task db:generate`, check the generated SQL, then run
`deno task db:migrate`. Commit the schema, migration and migration metadata together.

`app.ts` loads the signed-in user before the routes run. Use `Router<AuthState>`, read the user from
`ctx.state.user`, and add `requireUser` from `auth/sessions.ts` to routes that need login. The
homepage and movie details should stay public. Take author IDs from the session, never from
submitted form fields.

For protected forms, use `csrfToken` and `verifyCsrf` from `auth/security.ts`. The `readForm` helper
only handles small URL-encoded forms; poster uploads need a separate reader with a multipart size
limit.

Movie and review sample data still need to be added by the respective feature owners. The demo
account script only creates users.

## Branches

`main` is for checked versions of the project. `dev` is the shared development branch. Create a
branch for each piece of work and open a pull request into `dev`. Once the team has checked the
combined changes, open a pull request from `dev` into `main`.

## Student 2 — Nurym Zhumabayev

Branch `NurymZhumabayev` starts from `dev` and adds the homepage at `/`, shared header,
responsive catalogue, title search, latest-review dates and administrator deletion.
All page templates use the `.html` extension in `views/`. The server still renders them with
Handlebars, so movies, sessions and CSRF protection keep working. The frontend uses plain CSS
and JavaScript, with no frontend framework. Open pages through the running server; opening a
template directly from disk will not substitute its `{{...}}` expressions.
`movies/catalogue.ts` reads the existing MySQL tables through the shared Drizzle client.
No separate API service is needed: Oak renders the HTML and accepts normal form submissions.

Open `docs/role-2.html` in a browser for the sitemap, task flows, user journeys and illustrated
storyboard. `docs/explanation-ru.txt` explains each file and the request flow in Russian.
The UX scenarios are proposed designs, not claims of completed usability testing.

To enable administrator deletion, set `ADMIN_USER_IDS` in your local `.env` to the IDs of the
intended existing users, separated by commas, then restart the server. An empty value grants
nobody deletion permission. This is a small server-side access rule because the base schema
has no administrator role field. Deletion checks the session, configured ID, CSRF token and
movie ID; the existing foreign key cascades to reviews. JavaScript adds a confirmation dialog.

Posters must use local `/uploads/...` URLs. Missing or unsupported images use a bundled placeholder.
Static assets are served from `public/`. The temporary `public/css/home.css` can be incorporated
into Student 5's final global `style.css`. Movie details (`/movie/:id`), movie creation
(`/movies/add`) and review pages still belong to Students 3–5 and are not in the current base
branch. Their navigation destinations are prepared here; these links need their implementations.
No sample movies or fabricated reviews are inserted by this contribution.

Run the homepage tests without MySQL (the store is replaced with in-memory fixtures):

```sh
DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=test DB_PASSWORD=test DB_NAME=test deno test --allow-env --allow-read tests/home_test.ts
deno check app.ts
```

With a configured development MySQL database, also run the existing `deno task test:auth` suite
and verify the catalogue with real movies/reviews. Open `http://localhost:8000/` after starting.

### AI assistance for this contribution

| Tool | Use | Verification |
| --- | --- | --- |
| OpenAI Codex | Helped implement Student 2 homepage, navigation, backend queries, tests and UX documentation | Type checking, automated route checks and browser layout checks; live MySQL verification requires local database configuration |
