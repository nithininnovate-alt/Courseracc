import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emailLogsTable = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  template: text("template").notNull(),
  status: text("status").notNull().default("queued"),
  body: text("body"),
  html: text("html"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEmailLogSchema = createInsertSchema(emailLogsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogsTable.$inferSelect;
