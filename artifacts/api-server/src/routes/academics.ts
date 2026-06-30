import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { ZipArchive, type ArchiverError } from "archiver";
import {
  db,
  enrollmentsTable,
  assignmentsTable,
  submissionsTable,
  examsTable,
  examSubmissionsTable,
  resultsTable,
  subjectsTable,
  coursesTable,
  usersTable,
} from "@workspace/db";
import {
  CreateEnrollmentBody,
  CreateSubmissionBody,
  CreateAssignmentBody,
  UpdateAssignmentBody,
  GradeSubmissionBody,
  CreateExamBody,
  UpdateExamBody,
  CreateExamSubmissionBody,
  CreateResultBody,
  UpdateResultBody,
} from "@workspace/api-zod";
import {
  resolveCurrentUser,
  isStaff,
  requireUser,
  requireStaff,
  type AuthedRequest,
} from "../lib/auth";
import {
  sendEmail,
  buildSubmissionGraded,
  buildResultPublished,
} from "../lib/email";
import { generateResultReport } from "../lib/resultReport";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

function studentName(u: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  return (
    [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "Student"
  );
}

/* ----------------------------- enrollments ----------------------------- */

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

/* ----------------------------- assignments ----------------------------- */

router.get("/assignments", async (_req, res) => {
  res.json(await db.select().from(assignmentsTable));
});

router.post("/assignments", requireStaff, async (req, res) => {
  const parsed = CreateAssignmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [created] = await db
    .insert(assignmentsTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(created);
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

router.patch("/assignments/:id", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateAssignmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [updated] = await db
    .update(assignmentsTable)
    .set(parsed.data)
    .where(eq(assignmentsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }
  res.json(updated);
});

router.delete("/assignments/:id", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  await db
    .delete(submissionsTable)
    .where(eq(submissionsTable.assignmentId, id));
  await db.delete(assignmentsTable).where(eq(assignmentsTable.id, id));
  res.json({ success: true });
});

router.get(
  "/assignments/:id/submissions",
  requireStaff,
  async (req, res) => {
    const id = Number(req.params.id);
    res.json(
      await db
        .select()
        .from(submissionsTable)
        .where(eq(submissionsTable.assignmentId, id))
        .orderBy(desc(submissionsTable.submittedAt)),
    );
  },
);

// Binary ZIP download of every submitted file for an assignment (admin only).
// Not part of the OpenAPI JSON surface.
router.get(
  "/assignments/:id/submissions/download",
  async (req, res) => {
    const user = await resolveCurrentUser(req);
    if (!isStaff(user)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const id = Number(req.params.id);
    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, id));
    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    const rows = await db
      .select({
        fileUrl: submissionsTable.fileUrl,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        email: usersTable.email,
        userId: submissionsTable.userId,
      })
      .from(submissionsTable)
      .leftJoin(usersTable, eq(submissionsTable.userId, usersTable.id))
      .where(eq(submissionsTable.assignmentId, id));

    const withFiles = rows.filter((r) => r.fileUrl);
    if (withFiles.length === 0) {
      res.status(404).json({ error: "No submitted files to download" });
      return;
    }

    const safeTitle = assignment.title
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/(^-|-$)/g, "")
      .toLowerCase();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeTitle || "assignment"}-submissions.zip"`,
    );

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on("error", (err: ArchiverError) => {
      req.log.error({ err }, "Error building submissions zip");
      if (!res.headersSent) res.status(500);
      res.end();
    });
    archive.pipe(res);

    const usedNames = new Set<string>();
    for (const row of withFiles) {
      try {
        const file = await objectStorageService.getObjectEntityFile(
          row.fileUrl!,
        );
        const base =
          studentName(row)
            .replace(/[^a-z0-9]+/gi, "-")
            .replace(/(^-|-$)/g, "")
            .toLowerCase() || `student-${row.userId}`;
        let name = `${base}.pdf`;
        let n = 2;
        while (usedNames.has(name)) {
          name = `${base}-${n}.pdf`;
          n += 1;
        }
        usedNames.add(name);
        archive.append(file.createReadStream(), { name });
      } catch (err) {
        if (err instanceof ObjectNotFoundError) {
          req.log.warn({ objectPath: row.fileUrl }, "Submission file missing");
          continue;
        }
        throw err;
      }
    }

    await archive.finalize();
  },
);

/* ----------------------------- submissions ----------------------------- */

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
  const userId = req.currentUser!.id;

  const [assignment] = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.id, parsed.data.assignmentId));
  if (!assignment) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }
  if (assignment.dueDate.getTime() < Date.now()) {
    res
      .status(403)
      .json({ error: "The deadline for this assignment has passed" });
    return;
  }

  // Upsert: one submission per (assignment, student). Re-submitting before the
  // deadline replaces the previous file and resets any grading.
  const [existing] = await db
    .select()
    .from(submissionsTable)
    .where(
      and(
        eq(submissionsTable.assignmentId, parsed.data.assignmentId),
        eq(submissionsTable.userId, userId),
      ),
    );

  if (existing) {
    const [updated] = await db
      .update(submissionsTable)
      .set({
        fileUrl: parsed.data.fileUrl ?? null,
        note: parsed.data.note ?? null,
        status: "submitted",
        score: null,
        feedback: null,
        gradedAt: null,
        submittedAt: new Date(),
      })
      .where(eq(submissionsTable.id, existing.id))
      .returning();
    res.status(201).json(updated);
    return;
  }

  const [created] = await db
    .insert(submissionsTable)
    .values({ ...parsed.data, userId })
    .returning();
  res.status(201).json(created);
});

router.patch("/submissions/:id", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = GradeSubmissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [updated] = await db
    .update(submissionsTable)
    .set({
      score: parsed.data.score,
      feedback: parsed.data.feedback ?? null,
      status: "graded",
      gradedAt: new Date(),
    })
    .where(eq(submissionsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  // Notify the student that their work has been graded.
  const [assignment] = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.id, updated.assignmentId));
  const [student] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, updated.userId));
  if (assignment && student?.email) {
    const msg = buildSubmissionGraded({
      fullName: studentName(student),
      assignmentTitle: assignment.title,
      score: updated.score ?? 0,
      maxScore: assignment.maxScore,
      feedback: updated.feedback,
    });
    await sendEmail({ ...msg, to: student.email });
  }

  res.json(updated);
});

/* -------------------------------- exams -------------------------------- */

router.get("/exams", async (_req, res) => {
  res.json(await db.select().from(examsTable));
});

router.post("/exams", requireStaff, async (req, res) => {
  const parsed = CreateExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [created] = await db.insert(examsTable).values(parsed.data).returning();
  res.status(201).json(created);
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

router.patch("/exams/:id", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [updated] = await db
    .update(examsTable)
    .set(parsed.data)
    .where(eq(examsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  res.json(updated);
});

router.delete("/exams/:id", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  await db
    .delete(examSubmissionsTable)
    .where(eq(examSubmissionsTable.examId, id));
  await db.delete(resultsTable).where(eq(resultsTable.examId, id));
  await db.delete(examsTable).where(eq(examsTable.id, id));
  res.json({ success: true });
});

router.get("/exams/:id/submissions", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  res.json(
    await db
      .select()
      .from(examSubmissionsTable)
      .where(eq(examSubmissionsTable.examId, id))
      .orderBy(desc(examSubmissionsTable.submittedAt)),
  );
});

router.post("/exams/:id/publish-results", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, id));
  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  const published = await db
    .update(resultsTable)
    .set({ published: true, publishedAt: new Date() })
    .where(eq(resultsTable.examId, id))
    .returning();

  // Email each student whose result was just published.
  for (const result of published) {
    const [student] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, result.userId));
    if (student?.email) {
      const msg = buildResultPublished({
        fullName: studentName(student),
        examTitle: exam.title,
        score: result.score,
        totalMarks: exam.totalMarks,
        grade: result.grade,
        passed: result.passed,
      });
      await sendEmail({ ...msg, to: student.email });
    }
  }

  res.json({ success: true });
});

/* --------------------------- exam submissions -------------------------- */

router.get("/exam-submissions", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (isStaff(user)) {
    res.json(await db.select().from(examSubmissionsTable));
    return;
  }
  if (user) {
    res.json(
      await db
        .select()
        .from(examSubmissionsTable)
        .where(eq(examSubmissionsTable.userId, user.id)),
    );
    return;
  }
  res.json([]);
});

router.post(
  "/exam-submissions",
  requireUser,
  async (req: AuthedRequest, res) => {
    const parsed = CreateExamSubmissionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const userId = req.currentUser!.id;

    const [exam] = await db
      .select()
      .from(examsTable)
      .where(eq(examsTable.id, parsed.data.examId));
    if (!exam) {
      res.status(404).json({ error: "Exam not found" });
      return;
    }

    const now = Date.now();
    if (exam.startsAt && now < exam.startsAt.getTime()) {
      res
        .status(403)
        .json({ error: "The submission window has not opened yet" });
      return;
    }
    if (exam.endsAt && now > exam.endsAt.getTime()) {
      res.status(403).json({ error: "The submission window has closed" });
      return;
    }

    // Upsert: one answer submission per (exam, student).
    const [existing] = await db
      .select()
      .from(examSubmissionsTable)
      .where(
        and(
          eq(examSubmissionsTable.examId, parsed.data.examId),
          eq(examSubmissionsTable.userId, userId),
        ),
      );

    if (existing) {
      const [updated] = await db
        .update(examSubmissionsTable)
        .set({
          fileUrl: parsed.data.fileUrl ?? null,
          note: parsed.data.note ?? null,
          status: "submitted",
          submittedAt: new Date(),
        })
        .where(eq(examSubmissionsTable.id, existing.id))
        .returning();
      res.status(201).json(updated);
      return;
    }

    const [created] = await db
      .insert(examSubmissionsTable)
      .values({ ...parsed.data, userId })
      .returning();
    res.status(201).json(created);
  },
);

/* ------------------------------- results ------------------------------- */

router.get("/results", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (isStaff(user)) {
    res.json(
      await db
        .select()
        .from(resultsTable)
        .orderBy(desc(resultsTable.publishedAt)),
    );
    return;
  }
  if (user) {
    res.json(
      await db
        .select()
        .from(resultsTable)
        .where(
          and(
            eq(resultsTable.userId, user.id),
            eq(resultsTable.published, true),
          ),
        )
        .orderBy(desc(resultsTable.publishedAt)),
    );
    return;
  }
  res.json([]);
});

router.post("/results", requireStaff, async (req, res) => {
  const parsed = CreateResultBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  // Upsert: one result per (student, exam).
  const [existing] = await db
    .select()
    .from(resultsTable)
    .where(
      and(
        eq(resultsTable.userId, parsed.data.userId),
        eq(resultsTable.examId, parsed.data.examId),
      ),
    );

  if (existing) {
    const [updated] = await db
      .update(resultsTable)
      .set({
        score: parsed.data.score,
        grade: parsed.data.grade ?? null,
        passed: parsed.data.passed ?? false,
        remarks: parsed.data.remarks ?? null,
        ...(parsed.data.published !== undefined
          ? { published: parsed.data.published }
          : {}),
      })
      .where(eq(resultsTable.id, existing.id))
      .returning();
    res.status(201).json(updated);
    return;
  }

  const [created] = await db
    .insert(resultsTable)
    .values({
      userId: parsed.data.userId,
      examId: parsed.data.examId,
      score: parsed.data.score,
      grade: parsed.data.grade ?? null,
      passed: parsed.data.passed ?? false,
      remarks: parsed.data.remarks ?? null,
      published: parsed.data.published ?? false,
    })
    .returning();
  res.status(201).json(created);
});

router.patch("/results/:id", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateResultBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [updated] = await db
    .update(resultsTable)
    .set(parsed.data)
    .where(eq(resultsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Result not found" });
    return;
  }
  res.json(updated);
});

// Binary PDF result slip (not part of the OpenAPI JSON surface).
router.get("/results/:id/report", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = Number(req.params.id);
  const [result] = await db
    .select()
    .from(resultsTable)
    .where(eq(resultsTable.id, id));
  if (!result) {
    res.status(404).json({ error: "Result not found" });
    return;
  }
  if (!isStaff(user)) {
    if (result.userId !== user.id || !result.published) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const [exam] = await db
    .select()
    .from(examsTable)
    .where(eq(examsTable.id, result.examId));
  const [student] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, result.userId));

  let subjectTitle = "—";
  let courseTitle = "—";
  if (exam) {
    const [subject] = await db
      .select()
      .from(subjectsTable)
      .where(eq(subjectsTable.id, exam.subjectId));
    if (subject) {
      subjectTitle = subject.title;
      const [course] = await db
        .select()
        .from(coursesTable)
        .where(eq(coursesTable.id, subject.courseId));
      if (course) courseTitle = course.title;
    }
  }

  const pdf = await generateResultReport({
    studentName: student ? studentName(student) : "Student",
    studentEmail: student?.email ?? "",
    examTitle: exam?.title ?? "Examination",
    subjectTitle,
    courseTitle,
    score: result.score,
    totalMarks: exam?.totalMarks ?? 100,
    grade: result.grade,
    passed: result.passed,
    remarks: result.remarks,
    publishedAt: result.publishedAt,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="result-${result.id}.pdf"`,
  );
  res.send(Buffer.from(pdf));
});

export default router;
