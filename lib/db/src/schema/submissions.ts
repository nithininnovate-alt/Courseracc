import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default("submitted"),
  score: integer("score"),
  fileUrl: text("file_url"),
  textContent: text("text_content"),
  wordCount: integer("word_count"),
  note: text("note"),
  feedback: text("feedback"),
  gradedAt: timestamp("graded_at", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("submissions_assignment_user_unique").on(t.assignmentId, t.userId),
]);

export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({
  id: true,
  submittedAt: true,
});
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissionsTable.$inferSelect;
