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
  resultsTable,
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

router.get("/dashboard/analytics", requireStaff, async (_req, res) => {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const [appsByStatus, revenueRows, enrollmentRows, examRows, assignmentRows] =
    await Promise.all([
      db
        .select({ name: applicationsTable.status, value: sql<number>`count(*)::int` })
        .from(applicationsTable)
        .groupBy(applicationsTable.status),
      db
        .select({
          month: sql<string>`to_char(date_trunc('month', ${paymentsTable.createdAt}), 'YYYY-MM')`,
          value: sql<number>`coalesce(sum(${paymentsTable.amount}), 0)::float`,
        })
        .from(paymentsTable)
        .where(eq(paymentsTable.status, "completed"))
        .groupBy(sql`date_trunc('month', ${paymentsTable.createdAt})`)
        .orderBy(sql`date_trunc('month', ${paymentsTable.createdAt})`),
      db
        .select({ name: coursesTable.title, value: sql<number>`count(${enrollmentsTable.id})::int` })
        .from(coursesTable)
        .leftJoin(enrollmentsTable, eq(enrollmentsTable.courseId, coursesTable.id))
        .groupBy(coursesTable.id, coursesTable.title)
        .orderBy(sql`count(${enrollmentsTable.id}) desc`),
      db
        .select({
          name: examsTable.title,
          passed: sql<number>`coalesce(sum(case when ${resultsTable.passed} then 1 else 0 end), 0)::int`,
          failed: sql<number>`coalesce(sum(case when ${resultsTable.passed} then 0 else 1 end), 0)::int`,
        })
        .from(examsTable)
        .innerJoin(
          resultsTable,
          and(eq(resultsTable.examId, examsTable.id), eq(resultsTable.published, true)),
        )
        .groupBy(examsTable.id, examsTable.title),
      db
        .select({ status: submissionsTable.status, value: sql<number>`count(*)::int` })
        .from(submissionsTable)
        .groupBy(submissionsTable.status),
    ]);

  const revenueByMonth = revenueRows.map((r) => {
    const [year, month] = r.month.split("-");
    return { name: `${MONTHS[Number(month) - 1]} ${year.slice(2)}`, value: r.value };
  });

  const assignmentMap = new Map(assignmentRows.map((r) => [r.status, r.value]));

  res.json({
    applicationsByStatus: appsByStatus.map((r) => ({ name: r.name, value: r.value })),
    revenueByMonth,
    enrollmentsByCourse: enrollmentRows.slice(0, 8),
    examPassRates: examRows.slice(0, 8),
    assignmentCompletion: {
      graded: assignmentMap.get("graded") ?? 0,
      submitted: assignmentMap.get("submitted") ?? 0,
      pending: assignmentMap.get("pending") ?? 0,
    },
  });
});

export default router;
