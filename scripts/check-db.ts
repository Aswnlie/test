import { count } from "drizzle-orm";
import type { RowDataPacket } from "mysql2";
import { closeDatabase, db, pool } from "../db/client.ts";
import { movies, reviews, sessions, users } from "../db/schema.ts";

interface ConnectionInfo extends RowDataPacket {
  database_name: string;
  session_timezone: string;
  sample_date: Date;
}

async function checkConnection(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<ConnectionInfo[]>(
      `SELECT DATABASE() AS database_name,
                @@session.time_zone AS session_timezone,
                CAST('2026-01-02 03:04:05' AS DATETIME) AS sample_date`,
    );
    if (rows[0].session_timezone !== "+00:00") {
      throw new Error("A database connection is not using UTC");
    }
    if (rows[0].sample_date.toISOString() !== "2026-01-02T03:04:05.000Z") {
      throw new Error("The driver is not interpreting DATETIME as UTC");
    }
  } finally {
    connection.release();
  }
}

try {
  // check all 5 pool connections
  const checks = [];
  for (let i = 0; i < 5; i++) checks.push(checkConnection());
  await Promise.all(checks);

  const tables = { users, movies, reviews, sessions };
  const counts: Record<string, number> = {};
  for (const [name, table] of Object.entries(tables)) {
    const [result] = await db.select({ total: count() }).from(table);
    counts[name] = result.total;
  }
  console.log("MySQL + Drizzle: OK. All 5 pool connections use UTC.");
  console.table(counts);
} finally {
  await closeDatabase();
}
