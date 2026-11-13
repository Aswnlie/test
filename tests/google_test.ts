import { assertEquals, assertStringIncludes } from "@std/assert";
import { createApp } from "../app.ts";

Deno.test("Google login: redirect uses state and PKCE; callback rejects missing state", async () => {
  const app = createApp();
  const start = await app.handle(new Request("http://localhost:8000/auth/google"));
  if (
    Deno.env.get("GOOGLE_CLIENT_ID") && Deno.env.get("GOOGLE_CLIENT_SECRET") &&
    Deno.env.get("GOOGLE_REDIRECT_URI")
  ) {
    assertEquals(start?.status, 302);
    const url = new URL(start!.headers.get("location")!);
    assertEquals(url.origin, "https://accounts.google.com");
    assertEquals(url.searchParams.get("code_challenge_method"), "S256");
    assertEquals(url.searchParams.get("state")?.length, 64);
    assertEquals(url.searchParams.get("nonce")?.length, 64);
    assertStringIncludes(start!.headers.get("set-cookie")!.toLowerCase(), "httponly");
  } else {
    assertEquals(start?.status, 503);
  }
  await start?.body?.cancel();
  const callback = await app.handle(
    new Request("http://localhost:8000/auth/google/callback?code=wrong&state=wrong"),
  );
  assertEquals(callback?.status, 400);
  await callback?.body?.cancel();
});
