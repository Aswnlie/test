import { assertEquals, assertFalse, assertStringIncludes } from "jsr:@std/assert@1";
import { markdownToHtml } from "./markdown.ts";

Deno.test("bold text becomes <strong>", () => {
  assertStringIncludes(markdownToHtml("**hi**"), "<strong>hi</strong>");
});

Deno.test("list becomes <ul><li>", () => {
  const html = markdownToHtml("- a\n- b");
  assertStringIncludes(html, "<ul>");
  assertStringIncludes(html, "<li>a</li>");
});

Deno.test("empty description returns an empty string", () => {
  assertEquals(markdownToHtml(""), "");
  assertEquals(markdownToHtml(null), "");
});

Deno.test("<script> is removed together with its content", () => {
  const html = markdownToHtml("Hello <script>alert(1)</script>");
  assertFalse(html.includes("<script"));
  assertFalse(html.includes("alert"));
});

Deno.test("image with onerror is removed", () => {
  const html = markdownToHtml("<img src=x onerror=alert(1)>");
  assertFalse(html.includes("<img"));
  assertFalse(html.includes("onerror"));
});

Deno.test("javascript: link loses its address", () => {
  const html = markdownToHtml("[click](javascript:alert(1))");
  assertFalse(html.includes("javascript:"));
});

Deno.test("normal https link is kept", () => {
  const html = markdownToHtml("[site](https://example.com)");
  assertStringIncludes(html, 'href="https://example.com"');
});
