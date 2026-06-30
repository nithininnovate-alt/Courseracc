import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const materialProgressTable = pgTable(
  "material_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    materialId: integer("material_id").notNull(),
    courseId: integer("course_id").notNull(),
    action: text("action").notNull().default("completed"),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userMaterialUnique: unique().on(t.userId, t.materialId),
  }),
);

export const insertMaterialProgressSchema = createInsertSchema(materialProgressTable).omit({
  id: true,
  completedAt: true,
});
export type InsertMaterialProgress = z.infer<typeof insertMaterialProgressSchema>;
export type MaterialProgress = typeof materialProgressTable.$inferSelect;
