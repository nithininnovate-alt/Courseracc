import { pgTable, serial, integer, text, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subjectsTable = pgTable("subjects", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  credits: doublePrecision("credits").notNull().default(7.5),
  year: integer("year").notNull().default(1),
  semester: integer("semester").notNull().default(1),
  orderIndex: integer("order_index").notNull().default(0),
});

export const insertSubjectSchema = createInsertSchema(subjectsTable).omit({
  id: true,
});
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjectsTable.$inferSelect;
