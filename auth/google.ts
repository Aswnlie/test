import { Router } from "@oak/oak";
import { CodeChallengeMethod, OAuth2Client } from "npm:google-auth-library@10.5.0";
import { eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { googleAccounts, users } from "../db/schema.ts";
import { hash } from "./passwords.ts";
import { randomToken } from "./security.ts";
import { type AuthState, startSession } from "./sessions.ts";

export function googleRouter(): Router<AuthState> {
  const router = new Router<AuthState>();
  const id = Deno.env.get("GOOGLE_CLIENT_ID");
  const secret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const redirect = Deno.env.get("GOOGLE_REDIRECT_URI");
  const client = new OAuth2Client(id, secret, redirect);
  const cookie = {
    signed: true,
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/auth/google",
    maxAge: 600,
  };

  router.get("/auth/google", async (ctx) => {
    if (!id || !secret || !redirect) {
      ctx.response.status = 503;
      ctx.response.body =
        "Google sign-in is not configured. Please use your username and password.";
      return;
    }
    const state = randomToken();
    const nonce = randomToken();
    const codes = await client.generateCodeVerifierAsync();
    const options = { ...cookie, secure: ctx.request.secure };
    await ctx.cookies.set("google_state", state, options);
    await ctx.cookies.set("google_nonce", nonce, options);
    await ctx.cookies.set("google_verifier", codes.codeVerifier, options);
    ctx.response.redirect(client.generateAuthUrl({
      scope: ["openid", "email", "profile"],
      state,
      nonce,
      code_challenge: codes.codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
      prompt: "select_account",
    }));
  });

  router.get("/auth/google/callback", async (ctx) => {
    const query = ctx.request.url.searchParams;
    const state = await ctx.cookies.get("google_state");
    const nonce = await ctx.cookies.get("google_nonce");
    const verifier = await ctx.cookies.get("google_verifier");
    for (const name of ["google_state", "google_nonce", "google_verifier"]) {
      await ctx.cookies.set(name, null, { ...cookie, secure: ctx.request.secure });
    }
    if (!state || state !== query.get("state") || !nonce || !verifier) {
      ctx.response.status = 400;
      ctx.response.body = "This sign-in request expired. Go back to /login and try again.";
      return;
    }
    if (query.has("error")) {
      ctx.response.redirect("/login");
      return;
    }
    const code = query.get("code");
    if (!code || !id || !secret || !redirect) {
      ctx.response.status = 400;
      ctx.response.body = "Google sign-in could not be completed. Please try again from /login.";
      return;
    }
    try {
      const { tokens } = await client.getToken({ code, codeVerifier: verifier });
      if (!tokens.id_token) throw new Error("Missing ID token");
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: id });
      const profile = ticket.getPayload();
      if (!profile || profile.nonce !== nonce || !profile.sub || !profile.email_verified) {
        throw new Error("Invalid Google identity");
      }
      const userId = await db.transaction(async (tx) => {
        const [account] = await tx.select().from(googleAccounts)
          .where(eq(googleAccounts.subject, profile.sub)).limit(1);
        if (account) return account.userId;
        const username = "google_" + randomToken().slice(0, 32);
        const [user] = await tx.insert(users).values({
          username,
          passwordHash: await hash(randomToken()),
        }).$returningId();
        await tx.insert(googleAccounts).values({ subject: profile.sub, userId: user.id });
        return user.id;
      });
      await startSession(ctx, userId);
      ctx.response.status = 303;
      ctx.response.headers.set("Location", "/account");
    } catch {
      ctx.response.status = 502;
      ctx.response.body =
        "Google sign-in did not finish. Please try again from /login or use your username and password.";
    }
  });
  return router;
}
