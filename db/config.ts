import { env } from "node:process";

function required(name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

const port = Number(required("DB_PORT"));
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("DB_PORT must be an integer between 1 and 65535");
}

// used by app and drizzle migrations
export const databaseConfig = {
  host: required("DB_HOST"),
  port,
  user: required("DB_USER"),
  password: required("DB_PASSWORD"),
  database: required("DB_NAME"),
};
