import { and, eq, sql, asc } from "drizzle-orm";
import {
  db,
  coursesTable,
  paymentsTable,
  paymentPlansTable,
  enrollmentsTable,
  subjectsTable,
  studyMaterialsTable,
  materialProgressTable,
} from "@workspace/db";

export interface CourseAccess {
  courseId: number;
  hasAccess: boolean;
  price: number;
  paid: boolean;
}

export interface PlanStatus {
  courseId: number;
  hasPlan: boolean;
  planId: number | null;
  planType: string | null;
  installmentCount: number | null;
  installmentAmount: number | null;
  totalAmount: number | null;
  installmentsPaid: number;
  installmentsRemaining: number;
  nextAmountDue: number | null;
  totalPaid: number;
  isComplete: boolean;
}

/**
 * Derive the current student's payment plan status for a course from their
 * completed payment rows. A student's chosen plan is the planId recorded on
 * their payments; progress is the count of completed installments for it.
 */
export async function getPlanStatus(
  userId: number,
  courseId: number,
): Promise<PlanStatus> {
  const empty: PlanStatus = {
    courseId,
    hasPlan: false,
    planId: null,
    planType: null,
    installmentCount: null,
    installmentAmount: null,
    totalAmount: null,
    installmentsPaid: 0,
    installmentsRemaining: 0,
    nextAmountDue: null,
    totalPaid: 0,
    isComplete: false,
  };

  const completed = await db
    .select()
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.userId, userId),
        eq(paymentsTable.courseId, courseId),
        eq(paymentsTable.status, "completed"),
      ),
    )
    .orderBy(asc(paymentsTable.createdAt));

  if (completed.length === 0) return empty;

  const totalPaid = completed.reduce((sum, p) => sum + Number(p.amount), 0);
  const planId = completed.find((p) => p.planId != null)?.planId ?? null;

  // Legacy one-time payment (no plan linkage) — treat as fully paid.
  if (planId == null) {
    return {
      ...empty,
      hasPlan: true,
      planType: "one-time",
      installmentCount: 1,
      installmentAmount: totalPaid,
      totalAmount: totalPaid,
      installmentsPaid: 1,
      installmentsRemaining: 0,
      nextAmountDue: null,
      totalPaid,
      isComplete: true,
    };
  }

  const [plan] = await db
    .select()
    .from(paymentPlansTable)
    .where(eq(paymentPlansTable.id, planId));
  const paidForPlan = completed.filter((p) => p.planId === planId).length;

  if (!plan) {
    // Plan definition no longer exists (e.g. reconfigured); report what we know.
    return {
      ...empty,
      hasPlan: true,
      planId,
      planType: "installment",
      installmentCount: paidForPlan,
      installmentsPaid: paidForPlan,
      installmentsRemaining: 0,
      totalPaid,
      isComplete: true,
    };
  }

  const perAmount = Number(plan.installmentAmount);
  const remaining = Math.max(0, plan.installmentCount - paidForPlan);
  return {
    courseId,
    hasPlan: true,
    planId: plan.id,
    planType: plan.type,
    installmentCount: plan.installmentCount,
    installmentAmount: perAmount,
    totalAmount: Number(plan.totalAmount),
    installmentsPaid: paidForPlan,
    installmentsRemaining: remaining,
    nextAmountDue: remaining > 0 ? perAmount : null,
    totalPaid,
    isComplete: remaining === 0,
  };
}

export interface YearAccess {
  courseId: number;
  /** All years defined by the course curriculum, ascending. */
  years: number[];
  /** True when every year is unlocked (free course, full payment, legacy, or complete plan). */
  allYearsUnlocked: boolean;
  /** The subset of `years` the student may access, ascending. */
  unlockedYears: number[];
}

/**
 * Compute which curriculum years a student has unlocked for a course, derived
 * from their completed payments (never from a stored flag).
 *
 * Rules:
 * - Free course (price <= 0): all years unlocked.
 * - Legacy payment (no planId) or one-time plan: all years unlocked.
 * - Completed installment plan: all years unlocked.
 * - In-progress installment plan with N installments over Y years: paying
 *   installments unlocks years proportionally — unlocked year count =
 *   max(1, floor(paid * Y / N)). Paying the first installment always unlocks
 *   at least Year 1.
 */
export async function getUnlockedYears(
  userId: number,
  courseId: number,
): Promise<YearAccess> {
  const yearRows = await db
    .selectDistinct({ year: subjectsTable.year })
    .from(subjectsTable)
    .where(eq(subjectsTable.courseId, courseId));
  const years = yearRows.map((r) => r.year).sort((a, b) => a - b);

  const all: YearAccess = {
    courseId,
    years,
    allYearsUnlocked: true,
    unlockedYears: years,
  };

  const [course] = await db
    .select({ price: coursesTable.price })
    .from(coursesTable)
    .where(eq(coursesTable.id, courseId));
  if (!course || Number(course.price) <= 0) return all;

  const plan = await getPlanStatus(userId, courseId);
  if (!plan.hasPlan) {
    return { courseId, years, allYearsUnlocked: false, unlockedYears: [] };
  }
  if (plan.isComplete || plan.planType === "one-time") return all;

  const paid = plan.installmentsPaid;
  const count = plan.installmentCount ?? 1;
  if (paid <= 0) {
    return { courseId, years, allYearsUnlocked: false, unlockedYears: [] };
  }
  const yearCount = years.length;
  const unlockedCount = Math.min(
    yearCount,
    Math.max(1, Math.floor((paid * yearCount) / Math.max(1, count))),
  );
  const unlockedYears = years.slice(0, unlockedCount);
  return {
    courseId,
    years,
    allYearsUnlocked: unlockedCount >= yearCount,
    unlockedYears,
  };
}

/** Whether a student may access content belonging to a given curriculum year. */
export async function isYearUnlocked(
  userId: number,
  courseId: number,
  year: number,
): Promise<boolean> {
  const ya = await getUnlockedYears(userId, courseId);
  return ya.allYearsUnlocked || ya.unlockedYears.includes(year);
}

/**
 * Determine whether a user can access a course's content.
 * Free courses (price <= 0) are always accessible. Paid courses require a
 * completed payment record for that course.
 */
export async function getCourseAccess(
  userId: number,
  courseId: number,
): Promise<CourseAccess | null> {
  const [course] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, courseId));
  if (!course) return null;

  const price = Number(course.price);
  const [paidRow] = await db
    .select({ id: paymentsTable.id })
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.userId, userId),
        eq(paymentsTable.courseId, courseId),
        eq(paymentsTable.status, "completed"),
      ),
    )
    .limit(1);
  const paid = Boolean(paidRow);
  return { courseId, price, paid, hasAccess: price <= 0 || paid };
}

/**
 * Create an enrollment for a user/course if one does not already exist.
 * Returns true when a new enrollment was created (i.e. the course was newly
 * activated for the user), false when one already existed.
 */
export async function ensureEnrollment(
  userId: number,
  courseId: number,
): Promise<boolean> {
  const [existing] = await db
    .select({ id: enrollmentsTable.id })
    .from(enrollmentsTable)
    .where(
      and(
        eq(enrollmentsTable.userId, userId),
        eq(enrollmentsTable.courseId, courseId),
      ),
    )
    .limit(1);
  if (existing) return false;
  const inserted = await db
    .insert(enrollmentsTable)
    .values({ userId, courseId, status: "active", progress: 0 })
    .onConflictDoNothing({
      target: [enrollmentsTable.userId, enrollmentsTable.courseId],
    })
    .returning({ id: enrollmentsTable.id });
  return inserted.length > 0;
}

/**
 * Recompute a user's progress for a course based on completed materials and
 * persist it onto the enrollment record.
 */
export async function recomputeCourseProgress(
  userId: number,
  courseId: number,
): Promise<number> {
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(studyMaterialsTable)
    .innerJoin(
      subjectsTable,
      eq(studyMaterialsTable.subjectId, subjectsTable.id),
    )
    .where(eq(subjectsTable.courseId, courseId));

  const [{ done }] = await db
    .select({ done: sql<number>`count(*)::int` })
    .from(materialProgressTable)
    .where(
      and(
        eq(materialProgressTable.userId, userId),
        eq(materialProgressTable.courseId, courseId),
      ),
    );

  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  await ensureEnrollment(userId, courseId);
  const completed = progress >= 100;
  await db
    .update(enrollmentsTable)
    .set({
      progress,
      status: completed ? "completed" : "active",
      completedAt: completed
        ? sql`COALESCE(${enrollmentsTable.completedAt}, NOW())`
        : null,
    })
    .where(
      and(
        eq(enrollmentsTable.userId, userId),
        eq(enrollmentsTable.courseId, courseId),
      ),
    );

  return progress;
}

/**
 * Determine whether a user may read the storage object at objectPath because it
 * is a study material belonging to a course they have access to.
 */
export async function userCanAccessMaterialObject(
  userId: number,
  objectPath: string,
): Promise<boolean> {
  const [row] = await db
    .select({ courseId: subjectsTable.courseId, year: subjectsTable.year })
    .from(studyMaterialsTable)
    .innerJoin(
      subjectsTable,
      eq(studyMaterialsTable.subjectId, subjectsTable.id),
    )
    .where(eq(studyMaterialsTable.url, objectPath))
    .limit(1);
  if (!row) return false;
  const access = await getCourseAccess(userId, row.courseId);
  if (!access?.hasAccess) return false;
  return isYearUnlocked(userId, row.courseId, row.year);
}

/** Whether the user has an enrollment record for the given course. */
export async function isUserEnrolled(
  userId: number,
  courseId: number,
): Promise<boolean> {
  const [row] = await db
    .select({ id: enrollmentsTable.id })
    .from(enrollmentsTable)
    .where(
      and(
        eq(enrollmentsTable.userId, userId),
        eq(enrollmentsTable.courseId, courseId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/** Resolve the courseId that a given material belongs to (via its subject). */
export async function getCourseIdForMaterial(
  materialId: number,
): Promise<number | null> {
  const [row] = await db
    .select({ courseId: subjectsTable.courseId })
    .from(studyMaterialsTable)
    .innerJoin(
      subjectsTable,
      eq(studyMaterialsTable.subjectId, subjectsTable.id),
    )
    .where(eq(studyMaterialsTable.id, materialId))
    .limit(1);
  return row?.courseId ?? null;
}
