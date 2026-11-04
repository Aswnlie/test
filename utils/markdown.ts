import { marked } from "npm:marked@12.0.2";
import sanitizeHtml from "npm:sanitize-html@2.13.0";

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
