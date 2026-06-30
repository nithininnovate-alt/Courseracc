import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import {
  db,
  coursesTable,
  subjectsTable,
  studyMaterialsTable,
} from "@workspace/db";
import {
  CreateCourseBody,
  UpdateCourseBody,
  CreateSubjectBody,
  UpdateSubjectBody,
  CreateMaterialBody,
  UpdateMaterialBody,
} from "@workspace/api-zod";
import {
  requireStaff,
  resolveCurrentUser,
  isStaff,
} from "../lib/auth";
import { getCourseAccess } from "../lib/access";

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

router.patch("/courses/:id", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateCourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { price, ...rest } = parsed.data;
  const values: Record<string, unknown> = { ...rest };
  if (price !== undefined) values.price = String(price);
  const [updated] = await db
    .update(coursesTable)
    .set(values)
    .where(eq(coursesTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  res.json(serializeCourse(updated));
});

router.delete("/courses/:id", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(coursesTable).where(eq(coursesTable.id, id));
  res.json({ success: true });
});

router.get("/courses/:courseId/access", async (req, res) => {
  const courseId = Number(req.params.courseId);
  const user = await resolveCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (isStaff(user)) {
    const [course] = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId));
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    res.json({ courseId, hasAccess: true, price: Number(course.price), paid: true });
    return;
  }
  const access = await getCourseAccess(user.id, courseId);
  if (!access) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  res.json(access);
});

router.get("/courses/:courseId/subjects", async (req, res) => {
  const courseId = Number(req.params.courseId);
  const rows = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.courseId, courseId))
    .orderBy(
      asc(subjectsTable.year),
      asc(subjectsTable.semester),
      asc(subjectsTable.orderIndex),
    );
  res.json(rows);
});

router.post("/courses/:courseId/subjects", requireStaff, async (req, res) => {
  const courseId = Number(req.params.courseId);
  const parsed = CreateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [created] = await db
    .insert(subjectsTable)
    .values({ ...parsed.data, courseId })
    .returning();
  res.status(201).json(created);
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

router.patch("/subjects/:id", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [updated] = await db
    .update(subjectsTable)
    .set(parsed.data)
    .where(eq(subjectsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }
  res.json(updated);
});

router.delete("/subjects/:id", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(subjectsTable).where(eq(subjectsTable.id, id));
  res.json({ success: true });
});

router.get("/subjects/:subjectId/materials", async (req, res) => {
  const subjectId = Number(req.params.subjectId);
  const [subject] = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.id, subjectId));
  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  // Gate content behind payment for non-staff users.
  const user = await resolveCurrentUser(req);
  if (!isStaff(user)) {
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const access = await getCourseAccess(user.id, subject.courseId);
    if (!access?.hasAccess) {
      res.status(403).json({ error: "Payment required to access this content" });
      return;
    }
  }

  const rows = await db
    .select()
    .from(studyMaterialsTable)
    .where(eq(studyMaterialsTable.subjectId, subjectId))
    .orderBy(asc(studyMaterialsTable.orderIndex));
  res.json(rows);
});

router.post("/subjects/:subjectId/materials", requireStaff, async (req, res) => {
  const subjectId = Number(req.params.subjectId);
  const parsed = CreateMaterialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [created] = await db
    .insert(studyMaterialsTable)
    .values({ ...parsed.data, subjectId })
    .returning();
  res.status(201).json(created);
});

router.patch("/materials/:id", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateMaterialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [updated] = await db
    .update(studyMaterialsTable)
    .set(parsed.data)
    .where(eq(studyMaterialsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Material not found" });
    return;
  }
  res.json(updated);
});

router.delete("/materials/:id", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(studyMaterialsTable).where(eq(studyMaterialsTable.id, id));
  res.json({ success: true });
});

export default router;
