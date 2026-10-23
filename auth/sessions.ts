import { authConfig } from "./config.ts";
import type { Context, Middleware } from "@oak/oak";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../db/client.ts";
import { sessions, users } from "../db/schema.ts";
import { randomToken, toHex } from "./security.ts";

const cookieName = "movie_session";
const lifetime = authConfig.sessionLifetime;
export interface AuthState {
  user?: { id: number; username: string };
  sessionHash?: string;
}

// store raw token in cookie, hash in db
export async function tokenHash(token: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return toHex(new Uint8Array(bytes));
}

export const loadUser: Middleware<AuthState> = async (ctx, next) => {
  const token = await ctx.cookies.get(cookieName, { signed: false });
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    const digest = await tokenHash(token);
    // check database too
    const [session] = await db.select({
      id: users.id,
      username: users.username,
    })
      .from(sessions).innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(eq(sessions.tokenHash, digest), gt(sessions.expiresAt, new Date())),
      )
      .limit(1);
    if (session) {
      ctx.state.user = session;
      ctx.state.sessionHash = digest;
    }
  }
  await next();
};

export async function startSession(
  ctx: Context<AuthState>,
  userId: number,
): Promise<void> {
  const token = randomToken();
  const digest = await tokenHash(token);
  // swap session only if new one succeeds
  await db.transaction(async (tx) => {
    await tx.insert(sessions).values({
      tokenHash: digest,
      userId,
      expiresAt: new Date(Date.now() + lifetime * 1000),
    });
    if (ctx.state.sessionHash) {
      await tx.delete(sessions).where(
        eq(sessions.tokenHash, ctx.state.sessionHash),
      );
    }
  });
  await ctx.cookies.set(cookieName, token, {
    signed: false,
    httpOnly: true,
    sameSite: "lax",
    secure: ctx.request.secure,
    path: "/",
    maxAge: lifetime,
  });
}

export async function endSession(ctx: Context<AuthState>): Promise<void> {
  if (ctx.state.sessionHash) {
    await db.delete(sessions).where(
      eq(sessions.tokenHash, ctx.state.sessionHash),
    );
  }
  await ctx.cookies.set(cookieName, null, {
    signed: false,
    httpOnly: true,
    sameSite: "lax",
    secure: ctx.request.secure,
    path: "/",
  });
}

// protected GET and POST 
export const requireUser: Middleware<AuthState> = async (ctx, next) => {
  if (!ctx.state.user) {
    ctx.response.status = 303;
    ctx.response.headers.set("Location", "/login");
    return;
  }
  await next();
};
