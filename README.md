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

This contribution follows the role sheet: Deno/Oak, MySQL with Drizzle, and Handlebars layouts
and partials. The templates use `.hbs` again. The homepage displays each film's title, year,
poster and latest review date, or creation date if it has no reviews. Dates use YYYY-MM-DD.
There are links to Details and Add movie, plus an administrator-only delete form.

### Simple request flow

1. The browser requests `GET /`.
2. `movies/home.ts` calls the database functions in `movies/catalogue.ts`.
3. `views/render.ts` renders `views/home.hbs` inside `views/layouts/main.hbs`.
4. The browser receives complete HTML. No movie API or client-side card building is needed.
5. Deletion submits `POST /movies/:id/delete`; after success, the server redirects to the homepage.

JavaScript only adds a delete confirmation and missing-poster fallback. The list, navigation and
form submission work without JavaScript; confirmation requires JavaScript. All app pages share
`public/css/style.css`, with no inline CSS and a small responsive layout.

`ADMIN_USER_IDS` in `.env` contains comma-separated IDs of the intended existing administrators.
An empty value grants no deletion permission. Restart after changing it. The server checks the
session, administrator ID, CSRF and movie ID; the existing foreign key deletes related reviews.
This configuration is used because the inherited schema has no user-role column.

### Files and checks

- `views/home.hbs`: readable card markup and the `each` loop.
- `views/partials/header.hbs`: shared navigation.
- `views/layouts/main.hbs`: shared document structure.
- `public/css/style.css`: shared styles.
- `public/js/home.js`: confirmation and image fallback.
- `movies/home.ts`: homepage and protected deletion routes.
- `movies/catalogue.ts`: database reads and deletion.
- `docs/role-2.html`: sitemap, journeys and storyboard, not fabricated testing results.
- `docs/explanation-ru.txt`: Russian explanation for learning the code.

Run the homepage tests without MySQL using a test store:

```sh
DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=test DB_PASSWORD=test DB_NAME=test deno test --allow-env --allow-read tests/home_test.ts
deno check server.ts tests/*.ts
```

Real database verification requires a configured `.env` and MySQL. Details (`/movie/:id`),
adding movies (`/movies/add`), reviews and movie seed data remain the other students' work;
they are not implemented in this branch. The complete assignment also needs actual research,
two prototype iterations, user testing and each student's own individual presentation.

### AI assistance

This branch is AI-assisted and must not be described as fully compliant with the assignment's
restriction on AI-generated digital assets. The newly supplied brief prohibits that use.
Clarify permitted use with the module team before submission; a disclosure alone does not
remove the restriction. Personal reflections and real user-testing evidence are not generated here.

| Tool | Use |
| --- | --- |
| OpenAI Codex | Generated and revised Student 2 code, proposed UX material, documentation and automated tests |
