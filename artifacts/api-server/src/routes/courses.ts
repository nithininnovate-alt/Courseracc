import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import {
  db,
  coursesTable,
  subjectsTable,
  studyMaterialsTable,
} from "@workspace/db";
import { CreateCourseBody } from "@workspace/api-zod";
import { requireStaff } from "../lib/auth";

const router: IRouter = Router();

type CourseRow = typeof coursesTable.$inferSelect;
function serializeCourse(c: CourseRow) {
  return { ...c, price: Number(c.price) };
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base || "course"}-${Date.now().toString(36)}`;
}

router.get("/courses", async (_req, res) => {
  const rows = await db.select().from(coursesTable).orderBy(asc(coursesTable.title));
  res.json(rows.map(serializeCourse));
});

router.post("/courses", requireStaff, async (req, res) => {
  const parsed = CreateCourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const values = {
    ...parsed.data,
    slug: slugify(parsed.data.title),
    price: String(parsed.data.price ?? 0),
  };
  const [created] = await db.insert(coursesTable).values(values).returning();
  res.status(201).json(serializeCourse(created));
});

router.get("/courses/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(coursesTable).where(eq(coursesTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  res.json(serializeCourse(row));
});

router.get("/courses/:courseId/subjects", async (req, res) => {
  const courseId = Number(req.params.courseId);
  const rows = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.courseId, courseId))
    .orderBy(asc(subjectsTable.orderIndex));
  res.json(rows);
});

router.get("/subjects/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }
  res.json(row);
});

router.get("/subjects/:subjectId/materials", async (req, res) => {
  const subjectId = Number(req.params.subjectId);
  const rows = await db
    .select()
    .from(studyMaterialsTable)
    .where(eq(studyMaterialsTable.subjectId, subjectId));
  res.json(rows);
});

export default router;
