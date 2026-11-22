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

## Google sign-in

Create a Web application client in Google Auth Platform. Add this redirect URI:
`http://localhost:8000/auth/google/callback`. In Testing mode, add your Google
account to the test users.

Put `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI` in your
local `.env`. Use `.env.example` for the variable names. Keep the secret out of
Git. Run `deno task db:migrate`, then restart the server and open
`http://localhost:8000/login`. Use localhost rather than 127.0.0.1 so the cookies
and callback use the same host.

The Google link on login and registration creates an account on the first visit
and signs into that account on later visits. Google users get a generated
username beginning with `google_`. Existing password accounts stay separate;
we do not merge accounts by email. The app uses its normal session and logout
for both login methods. No Google access or refresh tokens are stored.

To check it, sign in with a test Google account, log out, and sign in again.
The same username should appear both times. Cancel at Google to return to login.
A missing or expired sign-in cookie should show an error instead of signing in.

### Team setup after pulling this change

Each developer uses their own local MySQL database. Pull the branch containing
this change, then run:

```sh
deno install
deno task db:migrate
deno task test:auth
deno task start
```

Add these values to your existing `.env` (keep your database settings):

```dotenv
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

You can create your own Google Web application client for local development.
If the team uses one client, its owner must add everyone's Google account to
Test users while the app is in Testing mode. Share credentials privately, not
through commits or the README. The callback URI must match exactly in Google
Cloud and `.env`.

If Google shows `redirect_uri_mismatch`, check the callback address. If access
is blocked during testing, check Test users. If the site says Google sign-in is
not configured, check the three variables and restart the server. Username and
password login still works without Google settings.

The migration adds `google_accounts`; it does not replace existing users. Google
accounts created on one developer's machine do not appear in anyone else's
local database. The password hash on a Google user is for a random, unused
password, not their Google password.

## Roles and deleting users

Run `deno task db:migrate` after pulling this change. Existing accounts and new
registrations, including Google accounts, have the `user` role by default.
Registration forms cannot choose a role.

To appoint an admin, a database maintainer can run this in MySQL, replacing the
username with the intended account:

```sql
UPDATE users SET role = 'admin' WHERE username = 'your_admin_username';
```

Do not promote the public demo accounts. Visit `/admin` to check access: guests
are redirected to login, ordinary users receive 403, and admins receive a short
confirmation. This is an access check page, not a completed admin dashboard.
Roles are read from the database on each request, so demotion takes effect on
the next request without waiting for the session to expire.

For admin routes, use `requireAdmin` from `auth/sessions.ts`. Use `requireUser`
for signed-in users. Both work on GET and POST routes. Changing or deleting data
also needs CSRF checks. For editing someone's movie or review, check ownership
on the server or explicitly allow admins; a hidden button is not access control.
Teammates must apply these checks when adding their feature routes.

Deleting a user now deletes their movies, reviews, sessions and Google account
link. Reviews written by other people on that user's movies are deleted too.
Deleting a movie deletes all its reviews. There is no delete-user endpoint in
this change. Do not delete real users just to test the cascade: the test suite
uses temporary records and rolls the cascade test back.


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

Deletion uses the current `users.role` from the database: only `admin` can delete.
The server checks the session, role, CSRF and movie ID. The database cascades related reviews.
The old `ADMIN_USER_IDS` environment variable is no longer used.

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

Real database verification requires a configured `.env` and MySQL. Movie details
(`/movie/:id`) and the movie seed script are integrated from dev. Adding movies
(`/movies/add`) and review submission remain pending team features. The complete assignment also needs actual research,
two prototype iterations, user testing and each student's own individual presentation.

### AI assistance

This branch is AI-assisted and must not be described as fully compliant with the assignment's
restriction on AI-generated digital assets. The newly supplied brief prohibits that use.
Clarify permitted use with the module team before submission; a disclosure alone does not
remove the restriction. Personal reflections and real user-testing evidence are not generated here.

| Tool | Use |
| --- | --- |
| OpenAI Codex | Generated and revised Student 2 code, proposed UX material, documentation and automated tests |

## Local integration source

Backend imported from ae7378/Group2-3, branch zhanelassilbek/db-and-auth,
commit 549c95391a6e626ae09ec3d1395862ce6625183e, supplied ZIP.
Nurym's homepage, layout, navigation, CSS, JavaScript and UX documents are retained.
Apply all bundled migrations to your local development database before starting.
The local .env is preserved; DB_HOST, DB_PORT, DB_USER, DB_PASSWORD and DB_NAME
must be supplied for a real MySQL instance. Google settings alone are insufficient.
Use http://localhost:8000 for Google sign-in (the callback must use the same host).
No remote repository was changed by this local integration.

## Local test database on this computer

A separate MySQL 8.4 instance is installed in `.local-mysql/` using official Ubuntu
packages, without a system service. Its data and private credentials are excluded
from Git. It listens only on `127.0.0.1:3307`, using database `movie_reviews_test`.
Connection settings are in the local `.env`; Google settings were preserved.

After a reboot, run `bash scripts/start-test-db.sh`, then `deno task start`.
Open http://localhost:8000/. Demo accounts: user1, user2, user3; password: p455w0rd.
These accounts have the ordinary user role. The catalogue starts empty.
Run `deno task test:auth` to check the project against this dedicated test database.
The MySQL binaries/data are local and are not included when cloning the repository.
