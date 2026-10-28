import Handlebars from "handlebars";

const templates = new Map<string, Handlebars.TemplateDelegate>();
for (
  const name of ["register", "registered", "login", "account", "home", "layouts/main"]
) {
  const source = await Deno.readTextFile(
    new URL(`./${name}.html`, import.meta.url),
  );
  templates.set(name, Handlebars.compile(source));
}
Handlebars.registerPartial(
  "header",
  await Deno.readTextFile(
    new URL("./partials/header.html", import.meta.url),
  ),
);

export function render(
  name: "register" | "registered" | "login" | "account" | "home",
  data: Record<string, unknown>,
): string {
  // render raw HTML only for our templates
  const body = templates.get(name)!(data);
  return templates.get("layouts/main")!({ ...data, body });
}
