import { authConfig } from "./config.ts";
import { type Context } from "@oak/oak";

export async function readForm(ctx: Context): Promise<URLSearchParams> {
  const contentType = ctx.request.headers.get("content-type")?.split(";")[0]
    .trim();
  ctx.assert(
    contentType === "application/x-www-form-urlencoded",
    415,
    "Unsupported form format",
  );
  const reader = ctx.request.body.stream?.getReader();
  ctx.assert(reader, 400, "Missing form body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      // limit by bytes,
      if (size > authConfig.formSize) {
        await reader.cancel();
        ctx.throw(413, "Form is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new URLSearchParams(new TextDecoder().decode(body));
}

export function toHex(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += byte.toString(16).padStart(2, "0");
  return text;
}

export function randomToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function csrfToken(ctx: Context, cookie = "auth_csrf", path = "/"): Promise<string> {
  let token = await ctx.cookies.get(cookie, { signed: true });
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    token = randomToken();
    await ctx.cookies.set(cookie, token, {
      signed: true,
      httpOnly: true,
      sameSite: "lax",
      secure: ctx.request.secure,
      path,
      maxAge: authConfig.csrfLifetime,
    });
  }
  return token;
}

// check both the request origin and the signed cookie token
export async function verifyCsrf(
  ctx: Context,
  form: URLSearchParams,
  cookie = "auth_csrf",
): Promise<void> {
  const origin = ctx.request.headers.get("origin");
  ctx.assert(
    !origin || origin === ctx.request.url.origin,
    403,
    "Invalid form origin",
  );
  const token = await ctx.cookies.get(cookie, { signed: true });
  ctx.assert(
    token && /^[a-f0-9]{64}$/.test(token) && form.get("csrf") === token,
    403,
    "Please reload the form and try again",
  );
}

export type Attempts = Map<string, { count: number; expires: number }>;

// local limiter that resets on restart
export function checkAttempts(ctx: Context, attempts: Attempts): void {
  const now = Date.now();
  for (const [ip, attempt] of attempts) {
    if (attempt.expires <= now) attempts.delete(ip);
  }
  const ip = ctx.request.ip;
  if (attempts.size >= authConfig.maxTrackedIps && !attempts.has(ip)) {
    ctx.throw(429, "Please try again later");
  }
  let attempt = attempts.get(ip);
  if (!attempt) {
    attempt = { count: 0, expires: now + authConfig.attemptWindow };
    attempts.set(ip, attempt);
  }
  attempt.count++;
  if (attempt.count > authConfig.maxAttempts) {
    ctx.response.headers.set("Retry-After", String(Math.ceil((attempt.expires - now) / 1000)));
    ctx.throw(429, "Too many attempts. Please try again in a minute.");
  }
}

export function validUsername(username: string): boolean {
  return /^[a-z0-9_]{3,50}$/.test(username);
}

// bcrypt limit is 72 bytes
export function validPassword(password: string): boolean {
  return [...password].length >= 8 && new TextEncoder().encode(password).length <= 72;
}
