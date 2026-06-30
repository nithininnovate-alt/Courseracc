import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const courierTrackingTable = pgTable("courier_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  certificateId: integer("certificate_id"),
  trackingNumber: text("tracking_number"),
  carrier: text("carrier"),
  status: text("status").notNull().default("requested"),
  shippingAddress: text("shipping_address"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
});

export const insertCourierTrackingSchema = createInsertSchema(courierTrackingTable).omit({
  id: true,
});
export type InsertCourierTracking = z.infer<typeof insertCourierTrackingSchema>;
export type CourierTracking = typeof courierTrackingTable.$inferSelect;
