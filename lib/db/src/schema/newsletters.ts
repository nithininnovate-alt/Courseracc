import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const newslettersTable = pgTable("newsletters", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  audience: text("audience").notNull().default("all"),
  courseId: integer("course_id"),
  recipientCount: integer("recipient_count").notNull().default(0),
  sentById: integer("sent_by_id"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNewsletterSchema = createInsertSchema(newslettersTable).omit(
  {
    id: true,
    sentAt: true,
  },
);

export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;
export type Newsletter = typeof newslettersTable.$inferSelect;
