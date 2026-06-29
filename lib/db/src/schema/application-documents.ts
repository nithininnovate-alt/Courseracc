import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const applicationDocumentsTable = pgTable("application_documents", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  name: text("name").notNull(),
  type: text("type"),
  objectPath: text("object_path").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertApplicationDocumentSchema = createInsertSchema(
  applicationDocumentsTable,
).omit({
  id: true,
  uploadedAt: true,
});
export type InsertApplicationDocument = z.infer<
  typeof insertApplicationDocumentSchema
>;
export type ApplicationDocument = typeof applicationDocumentsTable.$inferSelect;
