import { Router, type IRouter } from "express";
import { eq, and, ne, desc, sql } from "drizzle-orm";
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
  SaveSubmissionDraftBody,
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
  buildSubmissionApproval,
  buildResultPublished,
  buildSubmissionReceived,
  buildCourseActivation,
} from "../lib/email";
import { generateResultReport } from "../lib/resultReport";
import { generateEnrollmentLetter } from "../lib/enrollmentLetter";
import { letterValidatorFor } from "../lib/programInfo";
import { ensureStudentId } from "../lib/studentId";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * Check whether a subject belongs to a course the given user is enrolled in.
 * Enrollment of any status counts (active or completed).
 */
async function isEnrolledInSubject(
  userId: number,
  subjectId: number,
): Promise<boolean> {
  const [row] = await db
    .select({ id: subjectsTable.id })
    .from(subjectsTable)
    .innerJoin(
      enrollmentsTable,
      and(
        eq(enrollmentsTable.courseId, subjectsTable.courseId),
        eq(enrollmentsTable.userId, userId),
      ),
    )
    .where(eq(subjectsTable.id, subjectId));
  return Boolean(row);
}

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
    .onConflictDoNothing({
      target: [enrollmentsTable.userId, enrollmentsTable.courseId],
    })
    .returning();
  if (!created) {
    res.status(409).json({ error: "Already enrolled in this course" });
    return;
  }

  // Notify the student that their course has been activated.
  const student = req.currentUser!;
  const [course] = await db
    .select({ title: coursesTable.title })
    .from(coursesTable)
    .where(eq(coursesTable.id, created.courseId));

  // Allocate the permanent Student ID on first enrollment.
  try {
    await ensureStudentId(student.id, course?.title);
  } catch (err) {
    req.log.error({ err }, "Failed to allocate student ID");
  }

  if (student.email && course) {
    await sendEmail({
      ...buildCourseActivation({
        fullName: studentName(student),
        courseTitle: course.title,
      }),
      to: student.email,
    });
  }

  res.status(201).json(created);
});

// Binary PDF enrollment letter download (not part of the OpenAPI JSON surface).
router.get("/enrollments/:id/letter", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = Number(req.params.id);
  const [enrollment] = await db
    .select()
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.id, id));
  if (!enrollment) {
    res.status(404).json({ error: "Enrollment not found" });
    return;
  }
  if (enrollment.userId !== user.id && !isStaff(user)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const validatorParam = String(req.query.validator ?? "ieac").toLowerCase();
  if (validatorParam !== "ieac" && validatorParam !== "eahea") {
    res.status(400).json({ error: "validator must be 'ieac' or 'eahea'" });
    return;
  }
  const [student] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, enrollment.userId));
  const [course] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, enrollment.courseId));
  if (!student || !course) {
    res.status(404).json({ error: "Enrollment record incomplete" });
    return;
  }
  // Only the accreditation body matching the programme may validate the letter:
  // IEAC for BBA/MBA/DBA programmes, EAHEA for everything else.
  const allowedValidator = letterValidatorFor(course.title);
  if (validatorParam !== allowedValidator) {
    res.status(403).json({
      error: `This programme's enrollment letter is issued under ${allowedValidator.toUpperCase()} accreditation`,
    });
    return;
  }

  const pdf = await generateEnrollmentLetter({
    studentName: studentName(student),
    studentId: await ensureStudentId(student.id, course.title),
    programName: course.title,
    userId: enrollment.userId,
    enrolledAt: enrollment.enrolledAt ?? new Date(),
    validator: validatorParam,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="CGU-Enrollment-Letter-${validatorParam.toUpperCase()}-${enrollment.id}.pdf"`,
  );
  res.send(Buffer.from(pdf));
});

/* ----------------------------- assignments ----------------------------- */

router.get("/assignments", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (isStaff(user)) {
    res.json(await db.select().from(assignmentsTable));
    return;
  }
  if (user) {
    const rows = await db
      .selectDistinct({ assignment: assignmentsTable })
      .from(assignmentsTable)
      .innerJoin(subjectsTable, eq(subjectsTable.id, assignmentsTable.subjectId))
      .innerJoin(
        enrollmentsTable,
        and(
          eq(enrollmentsTable.courseId, subjectsTable.courseId),
          eq(enrollmentsTable.userId, user.id),
        ),
      );
    res.json(rows.map((r) => r.assignment));
    return;
  }
  res.json([]);
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

router.get("/assignments/:id", requireUser, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const [row] = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }
  const user = req.currentUser!;
  if (!isStaff(user) && !(await isEnrolledInSubject(user.id, row.subjectId))) {
    res.status(403).json({ error: "You are not enrolled in this course" });
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
    const rows = await db
      .select({
        submission: submissionsTable,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        email: usersTable.email,
        sid: usersTable.studentId,
      })
      .from(submissionsTable)
      .leftJoin(usersTable, eq(usersTable.id, submissionsTable.userId))
      .where(
        and(
          eq(submissionsTable.assignmentId, id),
          ne(submissionsTable.status, "draft"),
        ),
      )
      .orderBy(desc(submissionsTable.submittedAt));
    res.json(
      rows.map(({ submission, firstName, lastName, email, sid }) => ({
        ...submission,
        studentName:
          [firstName, lastName].filter(Boolean).join(" ") || email || null,
        studentId: sid ?? null,
      })),
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

/** Count words in typed submission text. */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

router.post("/submissions", requireUser, async (req: AuthedRequest, res) => {
  const parsed = CreateSubmissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const hasText = Boolean(parsed.data.textContent?.trim());
  if (!parsed.data.fileUrl && !hasText) {
    res
      .status(400)
      .json({ error: "Attach a file or type your work before submitting" });
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
  if (!(await isEnrolledInSubject(userId, assignment.subjectId))) {
    res.status(403).json({ error: "You are not enrolled in this course" });
    return;
  }
  if (assignment.dueDate.getTime() < Date.now()) {
    res
      .status(403)
      .json({ error: "The deadline for this assignment has passed" });
    return;
  }

  const textContent = hasText ? parsed.data.textContent!.trim() : null;
  const wordCount = textContent ? countWords(textContent) : null;

  // Was this the first real submission (no row, or only a draft)? Used solely
  // to decide whether to send the receipt email — a benign read.
  const [prior] = await db
    .select({ status: submissionsTable.status })
    .from(submissionsTable)
    .where(
      and(
        eq(submissionsTable.assignmentId, parsed.data.assignmentId),
        eq(submissionsTable.userId, userId),
      ),
    );
  const firstSubmission = !prior || prior.status === "draft";

  // Atomic upsert: one submission per (assignment, student), enforced by a DB
  // unique constraint. Re-submitting before the deadline replaces the work and
  // resets any grading; an existing file attachment is kept unless replaced.
  const [saved] = await db
    .insert(submissionsTable)
    .values({
      assignmentId: parsed.data.assignmentId,
      userId,
      fileUrl: parsed.data.fileUrl ?? null,
      textContent,
      wordCount,
      note: parsed.data.note ?? null,
      status: "submitted",
    })
    .onConflictDoUpdate({
      target: [submissionsTable.assignmentId, submissionsTable.userId],
      set: {
        fileUrl: parsed.data.fileUrl ?? sql`${submissionsTable.fileUrl}`,
        textContent,
        wordCount,
        note: parsed.data.note ?? null,
        status: "submitted",
        score: null,
        feedback: null,
        gradedAt: null,
        // A resubmission replaces the reviewed work, so staff must re-approve.
        approvalStatus: "pending",
        submittedAt: new Date(),
      },
    })
    .returning();

  // Acknowledge receipt of the submission by email.
  if (firstSubmission) {
    const [student] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (student?.email) {
      await sendEmail({
        ...buildSubmissionReceived({
          fullName: studentName(student),
          assignmentTitle: assignment.title,
        }),
        to: student.email,
      });
    }
  }

  res.status(201).json(saved);
});

router.post(
  "/submissions/draft",
  requireUser,
  async (req: AuthedRequest, res) => {
    const parsed = SaveSubmissionDraftBody.safeParse(req.body);
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
    if (!(await isEnrolledInSubject(userId, assignment.subjectId))) {
      res.status(403).json({ error: "You are not enrolled in this course" });
      return;
    }
    if (assignment.dueDate.getTime() < Date.now()) {
      res
        .status(403)
        .json({ error: "The deadline for this assignment has passed" });
      return;
    }

    const textContent = parsed.data.textContent;
    const wordCount = countWords(textContent);

    // Atomic upsert guarded by the (assignment, user) unique constraint. The
    // setWhere clause ensures an autosave never overwrites submitted or graded
    // work — in that case no row is updated and we return a conflict.
    const [saved] = await db
      .insert(submissionsTable)
      .values({
        assignmentId: parsed.data.assignmentId,
        userId,
        status: "draft",
        textContent,
        wordCount,
        note: parsed.data.note ?? null,
      })
      .onConflictDoUpdate({
        target: [submissionsTable.assignmentId, submissionsTable.userId],
        set: {
          textContent,
          wordCount,
          note: parsed.data.note ?? sql`${submissionsTable.note}`,
          submittedAt: new Date(),
        },
        setWhere: eq(submissionsTable.status, "draft"),
      })
      .returning();

    if (!saved) {
      // Row exists but is submitted/graded — never clobber it with an autosave.
      res.status(409).json({
        error: "Already submitted — resubmit explicitly to replace your work",
      });
      return;
    }
    res.json(saved);
  },
);

router.patch("/submissions/:id", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = GradeSubmissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { score, feedback, approvalStatus } = parsed.data;
  if (score === undefined && approvalStatus === undefined) {
    res.status(400).json({ error: "Provide a score and/or an approval status" });
    return;
  }
  const set: Partial<typeof submissionsTable.$inferInsert> = {};
  if (score !== undefined) {
    set.score = score;
    set.feedback = feedback ?? null;
    set.status = "graded";
    set.gradedAt = new Date();
  } else if (feedback !== undefined) {
    set.feedback = feedback;
  }
  if (approvalStatus !== undefined) set.approvalStatus = approvalStatus;
  // Read the prior approval status so we only email on an actual change.
  const [prior] = await db
    .select({ approvalStatus: submissionsTable.approvalStatus })
    .from(submissionsTable)
    .where(eq(submissionsTable.id, id));
  // Drafts are private student work — they can't be graded or approved.
  const [updated] = await db
    .update(submissionsTable)
    .set(set)
    .where(and(eq(submissionsTable.id, id), ne(submissionsTable.status, "draft")))
    .returning();
  if (!updated) {
    const [existing] = await db
      .select({ id: submissionsTable.id })
      .from(submissionsTable)
      .where(eq(submissionsTable.id, id));
    res
      .status(existing ? 409 : 404)
      .json({ error: existing ? "This submission is still a draft" : "Submission not found" });
    return;
  }

  // Notify the student. A graded update sends the grading email (which covers
  // any approval change made in the same request — never two emails at once);
  // an approval-only change sends the approval/revision email, but only when
  // the status actually changed.
  const [assignment] = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.id, updated.assignmentId));
  const [student] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, updated.userId));
  if (assignment && student?.email) {
    if (score !== undefined) {
      const msg = buildSubmissionGraded({
        fullName: studentName(student),
        assignmentTitle: assignment.title,
        score: updated.score ?? 0,
        maxScore: assignment.maxScore,
        feedback: updated.feedback,
      });
      await sendEmail({ ...msg, to: student.email });
    } else if (
      (approvalStatus === "approved" || approvalStatus === "needs_revision") &&
      prior?.approvalStatus !== approvalStatus
    ) {
      const msg = buildSubmissionApproval({
        fullName: studentName(student),
        assignmentTitle: assignment.title,
        approvalStatus,
      });
      await sendEmail({ ...msg, to: student.email });
    }
  }

  res.json(updated);
});

/* -------------------------------- exams -------------------------------- */

/**
 * The exam feature is disabled ("for now") — no UI links to it and all
 * interactive/mutating exam endpoints below return 403 with this message.
 * Historical read endpoints (GET /exams, GET /exam-submissions, GET /results,
 * GET /results/:id/report) remain available so previously published results
 * and reports still render. Flip this to true to restore the feature.
 */
const EXAMS_ENABLED = false;

function requireExamsEnabled(
  _req: unknown,
  res: import("express").Response,
  next: import("express").NextFunction,
) {
  if (!EXAMS_ENABLED) {
    res.status(403).json({ error: "The exam feature is disabled" });
    return;
  }
  next();
}

router.get("/exams", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (isStaff(user)) {
    res.json(await db.select().from(examsTable));
    return;
  }
  if (user) {
    const rows = await db
      .selectDistinct({ exam: examsTable })
      .from(examsTable)
      .innerJoin(subjectsTable, eq(subjectsTable.id, examsTable.subjectId))
      .innerJoin(
        enrollmentsTable,
        and(
          eq(enrollmentsTable.courseId, subjectsTable.courseId),
          eq(enrollmentsTable.userId, user.id),
        ),
      );
    res.json(rows.map((r) => r.exam));
    return;
  }
  res.json([]);
});

router.post("/exams", requireExamsEnabled, requireStaff, async (req, res) => {
  const parsed = CreateExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [created] = await db.insert(examsTable).values(parsed.data).returning();
  res.status(201).json(created);
});

router.get("/exams/:id", requireUser, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(examsTable).where(eq(examsTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  const user = req.currentUser!;
  if (!isStaff(user) && !(await isEnrolledInSubject(user.id, row.subjectId))) {
    res.status(403).json({ error: "You are not enrolled in this course" });
    return;
  }
  res.json(row);
});

router.patch("/exams/:id", requireExamsEnabled, requireStaff, async (req, res) => {
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

router.delete("/exams/:id", requireExamsEnabled, requireStaff, async (req, res) => {
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
  const rows = await db
    .select({
      submission: examSubmissionsTable,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      sid: usersTable.studentId,
    })
    .from(examSubmissionsTable)
    .leftJoin(usersTable, eq(usersTable.id, examSubmissionsTable.userId))
    .where(eq(examSubmissionsTable.examId, id))
    .orderBy(desc(examSubmissionsTable.submittedAt));

  const submissionRows = rows.map(
    ({ submission, firstName, lastName, email, sid }) => ({
      ...submission,
      studentName:
        [firstName, lastName].filter(Boolean).join(" ") || email || null,
      studentId: sid ?? null,
    }),
  );

  // Also include enrolled students who have not submitted an answer, so
  // staff can enter or edit marks for every student in the course.
  const [exam] = await db
    .select({ subjectId: examsTable.subjectId })
    .from(examsTable)
    .where(eq(examsTable.id, id));
  let rosterRows: Array<Record<string, unknown>> = [];
  if (exam) {
    const [subject] = await db
      .select({ courseId: subjectsTable.courseId })
      .from(subjectsTable)
      .where(eq(subjectsTable.id, exam.subjectId));
    if (subject) {
      const submittedUserIds = new Set(submissionRows.map((s) => s.userId));
      const enrolled = await db
        .select({
          userId: enrollmentsTable.userId,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          email: usersTable.email,
          sid: usersTable.studentId,
        })
        .from(enrollmentsTable)
        .leftJoin(usersTable, eq(usersTable.id, enrollmentsTable.userId))
        .where(eq(enrollmentsTable.courseId, subject.courseId));
      rosterRows = enrolled
        .filter((e) => !submittedUserIds.has(e.userId))
        .map((e) => ({
          id: null,
          examId: id,
          userId: e.userId,
          status: "not_submitted",
          studentName:
            [e.firstName, e.lastName].filter(Boolean).join(" ") ||
            e.email ||
            null,
          studentId: e.sid ?? null,
          fileUrl: null,
          note: null,
          submittedAt: null,
        }));
    }
  }

  res.json([...submissionRows, ...rosterRows]);
});

router.post("/exams/:id/publish-results", requireExamsEnabled, requireStaff, async (req, res) => {
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
  requireExamsEnabled,
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
    if (!(await isEnrolledInSubject(userId, exam.subjectId))) {
      res.status(403).json({ error: "You are not enrolled in this course" });
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

router.post("/results", requireExamsEnabled, requireStaff, async (req, res) => {
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

router.patch("/results/:id", requireExamsEnabled, requireStaff, async (req, res) => {
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
      // Indistinguishable from a missing result so students can't probe
      // for the existence of other students' (or unpublished) results.
      res.status(404).json({ error: "Result not found" });
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
    studentId: student ? await ensureStudentId(student.id, courseTitle !== "—" ? courseTitle : null) : null,
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
