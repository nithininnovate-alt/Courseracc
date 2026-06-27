import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  enrollmentsTable,
  assignmentsTable,
  submissionsTable,
  examsTable,
  resultsTable,
} from "@workspace/db";
import {
  CreateEnrollmentBody,
  CreateSubmissionBody,
} from "@workspace/api-zod";
import { resolveCurrentUser, isStaff, requireUser, type AuthedRequest } from "../lib/auth";

const router: IRouter = Router();

router.get("/enrollments", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (isStaff(user)) {
    res.json(await db.select().from(enrollmentsTable));
    return;
  }
  if (user) {
    res.json(
      await db
        .select()
        .from(enrollmentsTable)
        .where(eq(enrollmentsTable.userId, user.id)),
    );
    return;
  }
  res.json([]);
});

router.post("/enrollments", requireUser, async (req: AuthedRequest, res) => {
  const parsed = CreateEnrollmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [created] = await db
    .insert(enrollmentsTable)
    .values({ ...parsed.data, userId: req.currentUser!.id })
    .returning();
  res.status(201).json(created);
});

router.get("/assignments", async (_req, res) => {
  res.json(await db.select().from(assignmentsTable));
});

router.get("/assignments/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }
  res.json(row);
});

router.get("/submissions", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (isStaff(user)) {
    res.json(await db.select().from(submissionsTable));
    return;
  }
  if (user) {
    res.json(
      await db
        .select()
        .from(submissionsTable)
        .where(eq(submissionsTable.userId, user.id)),
    );
    return;
  }
  res.json([]);
});

router.post("/submissions", requireUser, async (req: AuthedRequest, res) => {
  const parsed = CreateSubmissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [created] = await db
    .insert(submissionsTable)
    .values({ ...parsed.data, userId: req.currentUser!.id })
    .returning();
  res.status(201).json(created);
});

router.get("/exams", async (_req, res) => {
  res.json(await db.select().from(examsTable));
});

router.get("/exams/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(examsTable).where(eq(examsTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  res.json(row);
});

router.get("/results", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (isStaff(user)) {
    res.json(await db.select().from(resultsTable).orderBy(desc(resultsTable.publishedAt)));
    return;
  }
  if (user) {
    res.json(
      await db
        .select()
        .from(resultsTable)
        .where(eq(resultsTable.userId, user.id))
        .orderBy(desc(resultsTable.publishedAt)),
    );
    return;
  }
  res.json([]);
});

export default router;
