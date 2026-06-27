import { Router, type IRouter } from "express";
import { sql, eq, and, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import {
  db,
  usersTable,
  applicationsTable,
  coursesTable,
  enrollmentsTable,
  submissionsTable,
  examsTable,
  certificatesTable,
  paymentsTable,
} from "@workspace/db";
import { requireUser, requireStaff, type AuthedRequest } from "../lib/auth";

const router: IRouter = Router();

async function countOf(table: PgTable, where?: SQL): Promise<number> {
  const base = db.select({ value: sql<number>`count(*)::int` }).from(table);
  const [row] = where ? await base.where(where) : await base;
  return row?.value ?? 0;
}

router.get("/dashboard/student", requireUser, async (req: AuthedRequest, res) => {
  const userId = req.currentUser!.id;
  const [enrolledCourses, completedCourses, pendingAssignments, upcomingExams, certificates] =
    await Promise.all([
      countOf(enrollmentsTable, eq(enrollmentsTable.userId, userId)),
      countOf(
        enrollmentsTable,
        and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.status, "completed")),
      ),
      countOf(
        submissionsTable,
        and(eq(submissionsTable.userId, userId), eq(submissionsTable.status, "submitted")),
      ),
      countOf(examsTable),
      countOf(certificatesTable, eq(certificatesTable.userId, userId)),
    ]);
  res.json({
    enrolledCourses,
    completedCourses,
    pendingAssignments,
    upcomingExams,
    certificates,
  });
});

router.get("/dashboard/admin", requireStaff, async (_req, res) => {
  const [totalStudents, pendingApplications, totalCourses, activeEnrollments, revenue] =
    await Promise.all([
      countOf(usersTable, eq(usersTable.role, "student")),
      countOf(applicationsTable, eq(applicationsTable.status, "pending")),
      countOf(coursesTable),
      countOf(enrollmentsTable, eq(enrollmentsTable.status, "active")),
      db
        .select({ total: sql<number>`coalesce(sum(amount), 0)::float` })
        .from(paymentsTable)
        .where(eq(paymentsTable.status, "completed")),
    ]);
  res.json({
    totalStudents,
    pendingApplications,
    totalCourses,
    activeEnrollments,
    totalRevenue: revenue[0]?.total ?? 0,
  });
});

export default router;
