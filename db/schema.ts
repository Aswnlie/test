import { sql } from "drizzle-orm";
import {
  char,
  check,
  datetime,
  index,
  int,
  mysqlTable,
  smallint,
  text,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";

// DATETIME is in UTC 
export const users = mysqlTable("users", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const movies = mysqlTable("movies", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  director: varchar("director", { length: 255 }).notNull(),
  releaseYear: smallint("release_year", { unsigned: true }).notNull(),
  description: text("description").notNull(),
  posterPath: varchar("poster_path", { length: 512 }).notNull(),
  userId: int("user_id", { unsigned: true }).notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  // current year limit checked in movie handler
  check("movies_release_year_min", sql`${table.releaseYear} >= 1930`),
]);

export const reviews = mysqlTable("reviews", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  movieId: int("movie_id", { unsigned: true }).notNull()
    .references(() => movies.id, { onDelete: "cascade" }),
  userId: int("user_id", { unsigned: true }).notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  rating: tinyint("rating", { unsigned: true }).notNull(),
  content: text("content").notNull(),
  createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  check("reviews_rating_range", sql`${table.rating} BETWEEN 1 AND 5`),
  index("reviews_movie_created_idx").on(table.movieId, table.createdAt),
]);

export const sessions = mysqlTable("sessions", {
  tokenHash: char("token_hash", { length: 64 }).primaryKey(),
  userId: int("user_id", { unsigned: true }).notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: datetime("expires_at").notNull(),
}, (table) => [
  index("sessions_expires_idx").on(table.expiresAt),
]);
