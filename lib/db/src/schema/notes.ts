import { pgTable, text } from "drizzle-orm/pg-core";

export const notesTable = pgTable("notes", {
  key: text("key").primaryKey(),
  content: text("content").notNull().default(""),
});

export type Note = typeof notesTable.$inferSelect;
