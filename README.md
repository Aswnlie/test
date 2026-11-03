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

The homepage is intentionally small: navigation and movie cards with title, year, poster,
latest-review date (or creation date), Details link and an administrator Delete button.
There is no search or featured section. All app pages share `public/css/style.css` with
semantic element/attribute selectors, no inline CSS and a mobile media query.

The `.html` templates still use Handlebars layouts and partials on the Deno/Oak server.
`public/js/home.js` calls the API with `fetch` and fills cards using `textContent`.
Open the site through the server, not by opening a template from disk.

### Simple API

| Request | Result |
| --- | --- |
| `GET /api/movies` | JSON containing `movies`, `isAdmin` and `csrf` |
| `POST /api/movies/:id/delete` | Deletes a movie; body is a URL-encoded `csrf` field; returns a JSON message |

The list is public. An administrator's list response includes the CSRF token needed for deletion.
Requests use the existing session cookie. An empty `ADMIN_USER_IDS` in `.env` grants no deletion
permission. Set it to the IDs of the intended existing users and restart the server.
The delete handler checks session, admin ID, CSRF and movie ID. Existing foreign keys delete
related reviews. API errors return `{ "error": "..." }` with the appropriate HTTP status.

`movies/catalogue.ts` uses the existing MySQL/Drizzle client. No new database or API server is
required. Uploaded posters use `/uploads/...`; missing images use a bundled placeholder.

### Files and checks

- `views/home.html`: page and reusable card template.
- `views/partials/header.html`: navigation.
- `public/css/style.css`: shared styles.
- `public/js/home.js`: load cards and send deletion requests.
- `movies/home.ts`: homepage and the two API routes.
- `movies/catalogue.ts`: database queries.
- `docs/role-2.html`: sitemap, journeys and storyboard (proposed scenarios, not testing results).
- `docs/explanation-ru.txt`: short Russian explanation and outstanding assignment work.

Run the API tests without MySQL using a test store:

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
