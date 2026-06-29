import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const applicationsTable = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  // Course selection
  programName: text("program_name").notNull(),
  courseId: integer("course_id"),
  // Personal information
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  nationality: text("nationality"),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  // Academic background
  previousQualification: text("previous_qualification"),
  previousInstitution: text("previous_institution"),
  graduationYear: text("graduation_year"),
  gradePercentage: text("grade_percentage"),
  // Review workflow
  status: text("status").notNull().default("pending"),
  reviewNote: text("review_note"),
  documentsUrl: text("documents_url"),
  admissionLetterUrl: text("admission_letter_url"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertApplicationSchema = createInsertSchema(applicationsTable).omit({
  id: true,
  submittedAt: true,
});
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applicationsTable.$inferSelect;
