import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p", "br", "hr",
  "strong", "em", "del",
  "ul", "ol", "li",
  "blockquote", "code", "pre",
  "h3", "h4", "h5", "h6",
  "a",
];

export function markdownToHtml(markdown: string | null | undefined): string {
  const rawHtml = marked.parse(markdown ?? "", { async: false }) as string;

  return sanitizeHtml(rawHtml, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href", "title"] },
    allowedSchemes: ["http", "https", "mailto"],
  });
}
