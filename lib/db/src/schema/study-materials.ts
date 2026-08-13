import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studyMaterialsTable = pgTable("study_materials", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull().default("text"),
  url: text("url"),
  content: text("content"),
  durationMinutes: integer("duration_minutes"),
  orderIndex: integer("order_index").notNull().default(0),
  // Text automatically extracted from the uploaded file (PDF text or video
  // transcript) so the AI assistant can ground answers in actual content.
  extractedText: text("extracted_text"),
  // pending | processing | done | failed | skipped
  extractionStatus: text("extraction_status"),
  extractionError: text("extraction_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStudyMaterialSchema = createInsertSchema(studyMaterialsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStudyMaterial = z.infer<typeof insertStudyMaterialSchema>;
export type StudyMaterial = typeof studyMaterialsTable.$inferSelect;
