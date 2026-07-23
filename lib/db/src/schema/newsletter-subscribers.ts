import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// External newsletter signups captured from embeddable forms on WordPress
// and other partner sites. Public endpoint writes here; staff read.
export const newsletterSubscribersTable = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  // Where the signup came from, e.g. the embedding page's hostname.
  source: text("source"),
  status: text("status").notNull().default("subscribed"), // subscribed | unsubscribed
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type NewsletterSubscriber =
  typeof newsletterSubscribersTable.$inferSelect;
