import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const lessonExplanationsTable = pgTable(
  "lesson_explanations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    materialId: integer("material_id").notNull(),
    courseId: integer("course_id").notNull(),
    mode: text("mode").notNull().default("explain"),
    content: text("content").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userMaterialUnique: unique().on(t.userId, t.materialId),
  }),
);

export const insertLessonExplanationSchema = createInsertSchema(lessonExplanationsTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertLessonExplanation = z.infer<typeof insertLessonExplanationSchema>;
export type LessonExplanation = typeof lessonExplanationsTable.$inferSelect;
