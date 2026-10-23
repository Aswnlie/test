import Handlebars from "handlebars";

const templates = new Map<string, Handlebars.TemplateDelegate>();
for (
  const name of ["register", "registered", "login", "account", "layouts/main"]
) {
  const source = await Deno.readTextFile(
    new URL(`./${name}.hbs`, import.meta.url),
  );
  templates.set(name, Handlebars.compile(source));
}
Handlebars.registerPartial(
  "auth-header",
  await Deno.readTextFile(
    new URL("./partials/auth-header.hbs", import.meta.url),
  ),
);

export function render(
  name: "register" | "registered" | "login" | "account",
  data: Record<string, unknown>,
): string {
  // render raw HTML only for our templates
  const body = templates.get(name)!(data);
  return templates.get("layouts/main")!({ ...data, body });
}
