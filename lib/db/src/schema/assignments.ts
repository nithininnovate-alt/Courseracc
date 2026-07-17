import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  instructionsUrl: text("instructions_url"),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull().defaultNow(),
  maxScore: real("max_score").notNull().default(7.5),
});

export const insertAssignmentSchema = createInsertSchema(assignmentsTable).omit({
  id: true,
});
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignmentsTable.$inferSelect;
