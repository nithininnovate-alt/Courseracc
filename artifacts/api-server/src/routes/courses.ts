import { Router, type IRouter } from "express";
import { eq, asc, and, inArray } from "drizzle-orm";
import {
  db,
  coursesTable,
  subjectsTable,
  studyMaterialsTable,
  enrollmentsTable,
  assignmentsTable,
  examsTable,
  examSubmissionsTable,
  resultsTable,
  submissionsTable,
  materialProgressTable,
  lessonExplanationsTable,
  paymentPlansTable,
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
import {
  queueMaterialExtraction,
  backfillMaterialExtractions,
} from "../lib/materialExtraction";
import {
  getCourseAccess,
  getUnlockedYears,
  isYearUnlocked,
} from "../lib/access";
import { letterValidatorFor } from "../lib/programInfo";

const router: IRouter = Router();

type CourseRow = typeof coursesTable.$inferSelect;
function serializeCourse(c: CourseRow) {
  return { ...c, price: Number(c.price), letterType: letterValidatorFor(c.title) };
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
  const [course] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, id));
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  // Cascade the course's academic data so no orphaned rows are left behind.
  // Financial and historical records (payments, applications, certificates)
  // are intentionally retained.
  const subjectRows = await db
    .select({ id: subjectsTable.id })
    .from(subjectsTable)
    .where(eq(subjectsTable.courseId, id));
  const subjectIds = subjectRows.map((s) => s.id);

  if (subjectIds.length > 0) {
    const examRows = await db
      .select({ id: examsTable.id })
      .from(examsTable)
      .where(inArray(examsTable.subjectId, subjectIds));
    const examIds = examRows.map((e) => e.id);
    const assignmentRows = await db
      .select({ id: assignmentsTable.id })
      .from(assignmentsTable)
      .where(inArray(assignmentsTable.subjectId, subjectIds));
    const assignmentIds = assignmentRows.map((a) => a.id);

    if (examIds.length > 0) {
      await db
        .delete(examSubmissionsTable)
        .where(inArray(examSubmissionsTable.examId, examIds));
      await db.delete(resultsTable).where(inArray(resultsTable.examId, examIds));
      await db.delete(examsTable).where(inArray(examsTable.id, examIds));
    }
    if (assignmentIds.length > 0) {
      await db
        .delete(submissionsTable)
        .where(inArray(submissionsTable.assignmentId, assignmentIds));
      await db
        .delete(assignmentsTable)
        .where(inArray(assignmentsTable.id, assignmentIds));
    }
    await db
      .delete(studyMaterialsTable)
      .where(inArray(studyMaterialsTable.subjectId, subjectIds));
    await db.delete(subjectsTable).where(inArray(subjectsTable.id, subjectIds));
  }

  await db
    .delete(materialProgressTable)
    .where(eq(materialProgressTable.courseId, id));
  await db
    .delete(lessonExplanationsTable)
    .where(eq(lessonExplanationsTable.courseId, id));
  await db.delete(enrollmentsTable).where(eq(enrollmentsTable.courseId, id));
  await db
    .delete(paymentPlansTable)
    .where(eq(paymentPlansTable.courseId, id));
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
    res.json({
      courseId,
      hasAccess: true,
      price: Number(course.price),
      paid: true,
      allYearsUnlocked: true,
      unlockedYears: [],
    });
    return;
  }
  const access = await getCourseAccess(user.id, courseId);
  if (!access) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  const yearAccess = await getUnlockedYears(user.id, courseId);
  res.json({
    ...access,
    allYearsUnlocked: yearAccess.allYearsUnlocked,
    unlockedYears: yearAccess.unlockedYears,
  });
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

router.get("/subjects", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (!user) {
    res.json([]);
    return;
  }
  if (isStaff(user)) {
    const rows = await db
      .select()
      .from(subjectsTable)
      .orderBy(asc(subjectsTable.courseId), asc(subjectsTable.year), asc(subjectsTable.semester), asc(subjectsTable.orderIndex));
    res.json(rows);
    return;
  }
  // Students only see subjects belonging to courses they are enrolled in.
  // selectDistinct guards against duplicate rows if a student somehow has
  // multiple enrollment records for the same course.
  const rows = await db
    .selectDistinct({ subject: subjectsTable })
    .from(subjectsTable)
    .innerJoin(
      enrollmentsTable,
      and(
        eq(enrollmentsTable.courseId, subjectsTable.courseId),
        eq(enrollmentsTable.userId, user.id),
      ),
    )
    .orderBy(asc(subjectsTable.courseId), asc(subjectsTable.year), asc(subjectsTable.semester), asc(subjectsTable.orderIndex));
  res.json(rows.map((r) => r.subject));
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
    if (!(await isYearUnlocked(user.id, subject.courseId, subject.year))) {
      res.status(403).json({
        error: `Payment required to unlock Year ${subject.year} content`,
        lockedYear: subject.year,
      });
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
  queueMaterialExtraction(created.id);
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
    .set(
      // A new file invalidates any previously extracted content.
      parsed.data.url !== undefined
        ? {
            ...parsed.data,
            extractedText: null,
            extractionStatus: null,
            extractionError: null,
          }
        : parsed.data,
    )
    .where(eq(studyMaterialsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Material not found" });
    return;
  }
  if (parsed.data.url !== undefined) {
    queueMaterialExtraction(updated.id);
  }
  res.json(updated);
});

// Manually (re)run content extraction for one material.
router.post("/materials/:id/extract", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  const [material] = await db
    .select()
    .from(studyMaterialsTable)
    .where(eq(studyMaterialsTable.id, id));
  if (!material) {
    res.status(404).json({ error: "Material not found" });
    return;
  }
  queueMaterialExtraction(id);
  res.json({ status: "queued" });
});

// Extract every uploaded PDF/video that hasn't been processed yet.
router.post("/materials/extract-all", requireStaff, async (_req, res) => {
  const result = await backfillMaterialExtractions();
  res.json(result);
});

router.delete("/materials/:id", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(studyMaterialsTable).where(eq(studyMaterialsTable.id, id));
  res.json({ success: true });
});

export default router;
