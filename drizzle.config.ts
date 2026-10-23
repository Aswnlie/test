import { defineConfig } from "drizzle-kit";
import { databaseConfig } from "./db/config.ts";

export default defineConfig({
  dialect: "mysql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: databaseConfig,
});
