import { pgTable, serial, integer, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Partner centers that can issue tuition discount codes. */
export const partnerCentersTable = pgTable("partner_centers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  /** "percent" (of amount due) or "fixed" (absolute amount in payment currency). */
  discountType: text("discount_type").notNull().default("percent"),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Discount codes issued by a partner center. */
export const discountCodesTable = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  centerId: integer("center_id").notNull(),
  code: text("code").notNull().unique(),
  active: boolean("active").notNull().default(true),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPartnerCenterSchema = createInsertSchema(partnerCentersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPartnerCenter = z.infer<typeof insertPartnerCenterSchema>;
export type PartnerCenter = typeof partnerCentersTable.$inferSelect;

export const insertDiscountCodeSchema = createInsertSchema(discountCodesTable).omit({
  id: true,
  createdAt: true,
  usageCount: true,
});
export type InsertDiscountCode = z.infer<typeof insertDiscountCodeSchema>;
export type DiscountCode = typeof discountCodesTable.$inferSelect;
