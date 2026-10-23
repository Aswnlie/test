import { databaseConfig } from "./config.ts";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import * as schema from "./schema.ts";

const connectionPool = mysql.createPool({
  ...databaseConfig,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 50,
  connectTimeout: 10_000,
  charset: "utf8mb4",
  // handle dates in UTC
  timezone: "Z",
});

// UTC for mysql default timestamps
connectionPool.on("connection", (connection) => {
  connection.query("SET SESSION time_zone = '+00:00'", (error) => {
    if (error) connection.destroy();
  });
});

export const pool = connectionPool.promise();
export const db = drizzle(pool, { schema, mode: "default" });

// close only on exit
export async function closeDatabase(): Promise<void> {
  await pool.end();
}
