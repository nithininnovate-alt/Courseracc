import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resultsTable = pgTable("results", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  examId: integer("exam_id").notNull(),
  score: integer("score").notNull().default(0),
  grade: text("grade"),
  passed: boolean("passed").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertResultSchema = createInsertSchema(resultsTable).omit({
  id: true,
  publishedAt: true,
});
export type InsertResult = z.infer<typeof insertResultSchema>;
export type Result = typeof resultsTable.$inferSelect;
