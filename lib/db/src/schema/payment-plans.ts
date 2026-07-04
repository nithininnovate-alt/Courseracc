import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentPlansTable = pgTable("payment_plans", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  type: text("type").notNull().default("installment"),
  name: text("name"),
  installmentCount: integer("installment_count").notNull().default(1),
  installmentAmount: numeric("installment_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPaymentPlanSchema = createInsertSchema(paymentPlansTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPaymentPlan = z.infer<typeof insertPaymentPlanSchema>;
export type PaymentPlan = typeof paymentPlansTable.$inferSelect;
