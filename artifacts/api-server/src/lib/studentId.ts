import { sql, eq, asc, isNull, and } from "drizzle-orm";
import { db, usersTable, enrollmentsTable, coursesTable } from "@workspace/db";
import { resolveProgramInfo } from "./programInfo";

/**
 * Return the user's permanent Student ID, allocating one if missing.
 *
 * Format: CGU[PROGRAMCODE][SEQ] (e.g. CGUBBA2600). The numeric part comes
 * from the `student_id_seq` Postgres sequence (starts at 2600), so IDs are
 * sequential across all students and race-safe. The program code is taken
 * from `programName` when provided, otherwise from the student's earliest
 * enrollment.
 */
export async function ensureStudentId(
  userId: number,
  programName?: string | null,
): Promise<string | null> {
  const [user] = await db
    .select({ studentId: usersTable.studentId })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) return null;
  if (user.studentId) return user.studentId;

  let name = programName ?? null;
  if (!name) {
    const [enrollment] = await db
      .select({ title: coursesTable.title })
      .from(enrollmentsTable)
      .innerJoin(coursesTable, eq(coursesTable.id, enrollmentsTable.courseId))
      .where(eq(enrollmentsTable.userId, userId))
      .orderBy(asc(enrollmentsTable.enrolledAt))
      .limit(1);
    name = enrollment?.title ?? null;
  }
  if (!name) return null;

  const code = resolveProgramInfo(name).code;
  const result = await db.execute(sql`SELECT nextval('student_id_seq') AS seq`);
  const seq = (result.rows[0] as { seq: string | number }).seq;
  const studentId = `CGU${code}${seq}`;

  const [updated] = await db
    .update(usersTable)
    .set({ studentId })
    .where(and(eq(usersTable.id, userId), isNull(usersTable.studentId)))
    .returning({ studentId: usersTable.studentId });
  if (updated?.studentId) return updated.studentId;

  // Lost a race with a concurrent allocation — re-read the winner's value.
  const [fresh] = await db
    .select({ studentId: usersTable.studentId })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return fresh?.studentId ?? null;
}
