import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, materialProgressTable } from "@workspace/db";
import { RecordProgressBody } from "@workspace/api-zod";
import { requireUser, type AuthedRequest } from "../lib/auth";
import { getCourseIdForMaterial, recomputeCourseProgress } from "../lib/access";

const router: IRouter = Router();

router.get("/progress", requireUser, async (req: AuthedRequest, res) => {
  const userId = req.currentUser!.id;
  const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;
  const where = courseId
    ? and(
        eq(materialProgressTable.userId, userId),
        eq(materialProgressTable.courseId, courseId),
      )
    : eq(materialProgressTable.userId, userId);
  const rows = await db
    .select()
    .from(materialProgressTable)
    .where(where)
    .orderBy(desc(materialProgressTable.completedAt));
  res.json(rows);
});

router.post("/progress", requireUser, async (req: AuthedRequest, res) => {
  const parsed = RecordProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const userId = req.currentUser!.id;
  const { materialId, action } = parsed.data;
  const courseId = await getCourseIdForMaterial(materialId);
  if (courseId === null) {
    res.status(404).json({ error: "Material not found" });
    return;
  }

  const [row] = await db
    .insert(materialProgressTable)
    .values({ userId, materialId, courseId, action: action ?? "completed" })
    .onConflictDoUpdate({
      target: [materialProgressTable.userId, materialProgressTable.materialId],
      set: { action: action ?? "completed", completedAt: new Date() },
    })
    .returning();

  await recomputeCourseProgress(userId, courseId);

  res.status(201).json(row);
});

export default router;
