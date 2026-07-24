import { pgTable, pgSequence, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Sequence backing permanent Student ID allocation (e.g. CGUBBA2600).
export const studentIdSeq = pgSequence("student_id_seq", { startWith: 2600 });

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").unique(),
  username: text("username").unique(),
  passwordHash: text("password_hash"),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("student"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  nationality: text("nationality"),
  city: text("city"),
  address: text("address"),
  country: text("country"),
  studentId: text("student_id").unique(),
  fatherName: text("father_name"),
  motherName: text("mother_name"),
  parentName: text("parent_name"),
  parentRelationship: text("parent_relationship"),
  parentPhone: text("parent_phone"),
  parentEmail: text("parent_email"),
  parentOccupation: text("parent_occupation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
