import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  courseId: integer("course_id"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("pending"),
  provider: text("provider").notNull().default("manual"),
  reference: text("reference"),
  invoiceNumber: text("invoice_number"),
  planId: integer("plan_id"),
  installmentIndex: integer("installment_index"),
  /** Applied partner discount (null when no code was used). */
  discountCodeId: integer("discount_code_id"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
