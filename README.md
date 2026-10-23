# movie-reviews-app

Movie reviews web application(Coventry University)

## Database (Student 1)

Copy `.env.example` to `.env` and fill in your local MySQL credentials. Run
commands from the project root:

```sh
deno task db:migrate  # apply committed migrations to your local database
deno task db:check    # read-only connection, UTC and table checks
```

Use the shared Drizzle client in server modules:

```ts
import { db } from "./db/client.ts";
import { movies } from "./db/schema.ts";

const catalogue = await db.select().from(movies);
```

Adjust relative import paths for nested modules. Do not create a pool per
request. The pool opens at most five connections. It sets every connection's
MySQL session time zone to UTC and uses `timezone: "Z"` for JavaScript date
conversion. `DATETIME` fields contain UTC by convention; manual inserts in
Workbench must also use UTC. Format dates for display separately. Call
`closeDatabase()` once during application shutdown; standalone scripts should
call it in a `finally` block.

After changing `db/schema.ts`, run `deno task db:generate`, inspect the SQL in
`db/migrations`, then run `deno task db:migrate`. Commit the schema and
migration metadata together. Do not commit `.env` or share local passwords.

## Registration (Student 1)

```sh
deno task start
```

Open http://localhost:8000/register (the server binds to loopback only). Stop
with Ctrl+C. The catalogue and global CSS are separate teammates' work; this
stage exposes registration only, without sign-in or automatic login.

Usernames are trimmed, converted to lowercase and restricted to 3–50 ASCII
letters, digits or underscores. Passwords are never trimmed or redisplayed; they
must contain at least 8 Unicode code points and at most 72 UTF-8 bytes (the
bcrypt limit). The database stores bcrypt hashes with random salts. Registration
catches the database's unique-username constraint, including concurrent
attempts. Browser validation supplements server validation.

The form uses a signed, HttpOnly, SameSite CSRF cookie, a hidden token and an
Origin check. Restarting the server invalidates open forms: reload them. Cookies
use Secure when served over HTTPS. Registration accepts at most 16 KiB of
URL-encoded form data and 10 attempts per IP per minute. The limiter is
in-memory and intended for local development; shared hosting needs a shared
limiter and appropriate HTTPS configuration.

```sh
deno task test:registration
```

This integration test uses the database in `.env`. It creates a uniquely named
`test_...` user and deletes that user in `finally`; run against a development
database. It checks validation, CSRF, password hashing, duplicate usernames,
HTML escaping and rate limiting. It never prints passwords or stored hashes.

## Login and sessions (Student 1)

Open http://localhost:8000/login after `deno task start`. Login redirects to
`/account`, a protected page for checking authentication. The required demo
users are `user1`, `user2`, `user3`, each with password `p455w0rd`; these
accounts must exist in each developer's local database (they are not shipped
through Git).

A successful login creates a fresh 256-bit random cookie token. MySQL stores
only its SHA-256 hash, user ID and a fixed seven-day expiry. Each request checks
the expiry on the server. Login rotates an existing authenticated session;
logout uses POST with CSRF protection, deletes the current session and clears
its cookie. Expired rows can remain in the database but never authenticate a
request. Session cookies use HttpOnly, SameSite=Lax, and Secure when HTTPS is in
use. Sign-in uses a generic error, a bcrypt check for unknown usernames, and an
in-memory limit of ten attempts per IP per minute.

For integration, `app.ts` installs `loadUser` before routes. Other students can
use `ctx.state.user` (ID and username only), and `requireUser` from
`auth/sessions.ts` on both GET and POST handlers that require login. Their
routers should use `Router<AuthState>`. Keep the homepage and movie details
public. Protected forms must also implement CSRF checks: the shared `csrfToken`
and `verifyCsrf` helpers are in `auth/security.ts`. The `readForm` helper
accepts only small URL-encoded forms; the poster upload needs its own bounded
multipart reader. Never accept the author ID from a submitted form.

Run `deno task test:auth` to check registration and session lifecycle against
the development database. Test accounts and sessions are removed afterwards. The
login tests cover forged cookies, session rotation, expiry, recreation of the
app, CSRF and logout replay. No existing demo accounts are modified.

The server listens on loopback only. Press Ctrl+C once to stop; shutdown has a
five-second fallback for stalled connections. Restart and reload forms after
code changes. Before multi-instance/public hosting, replace in-memory rate
limits with a shared store and configure HTTPS and trusted proxy behavior
deliberately.

## Prepare required demo accounts

After configuring `.env` and applying migrations, run:

```sh
deno task db:seed-users
```

Creates missing `user1`, `user2`, `user3` with the assignment password
`p455w0rd` using separately salted bcrypt hashes. Repeated runs verify existing
passwords and leave IDs, hashes, creation dates and sessions unchanged. If an
existing demo account has a different password, the command fails without
resetting it and rolls back any accounts created in that run. Check the account
deliberately instead of deleting it: it may already own movies and reviews.

Each teammate and the marker runs this command against their own local database.
This command creates accounts only; the required movies and reviews remain the
responsibility of the respective feature owners. Real deployment credentials
must differ from these publicly documented assignment credentials.

Suggested local setup order:

1. Create the MySQL database and local MySQL application user.
2. Copy `.env.example` to `.env` and enter local credentials.
3. Run `deno install`.
4. Run `deno task db:migrate`.
5. Run `deno task db:seed-users`.
6. Run `deno task db:check`.
7. Run `deno task start` and open http://localhost:8000/login.

`deno task test:auth` also checks seed creation and repeated runs using
temporary accounts inside a rolled-back transaction, without changing
`user1`–`user3`.
