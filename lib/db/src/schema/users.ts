import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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
  address: text("address"),
  country: text("country"),
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
