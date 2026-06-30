import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const examSubmissionsTable = pgTable("exam_submissions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default("submitted"),
  fileUrl: text("file_url"),
  note: text("note"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExamSubmissionSchema = createInsertSchema(examSubmissionsTable).omit({
  id: true,
  submittedAt: true,
});
export type InsertExamSubmission = z.infer<typeof insertExamSubmissionSchema>;
export type ExamSubmission = typeof examSubmissionsTable.$inferSelect;
