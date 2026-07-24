import { eq } from "drizzle-orm";
import { db, usersTable, type Application, type User } from "@workspace/db";

/**
 * Copies an applicant's submitted details into their student profile,
 * filling ONLY fields that are still empty so nothing the student has
 * edited in their profile is ever overwritten.
 *
 * Used at approval time and by the one-time startup backfill for students
 * whose applications were approved before this sync existed.
 *
 * Returns the number of profile fields that were filled in.
 */
export async function syncApplicationToProfile(
  userId: number,
  application: Application,
): Promise<number> {
  const [profile] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!profile) return 0;

  const empty = (v: string | null | undefined) => !v || !v.trim();
  const fill: Partial<typeof usersTable.$inferInsert> = {};

  if (empty(profile.firstName) && empty(profile.lastName)) {
    const parts = application.fullName.trim().split(/\s+/);
    if (parts[0]) {
      fill.firstName = parts[0];
      if (parts.length > 1) fill.lastName = parts.slice(1).join(" ");
    }
  }

  const map: Array<[
    keyof Pick<
      User,
      | "phone"
      | "dateOfBirth"
      | "gender"
      | "fatherName"
      | "motherName"
      | "nationality"
      | "city"
      | "country"
      | "address"
    >,
    string | null,
  ]> = [
    ["phone", application.phone],
    ["dateOfBirth", application.dateOfBirth],
    ["gender", application.gender],
    ["fatherName", application.fatherName],
    ["motherName", application.motherName],
    ["nationality", application.nationality],
    ["city", application.city],
    ["country", application.country],
    ["address", application.address],
  ];
  for (const [key, value] of map) {
    if (value?.trim() && empty(profile[key])) {
      fill[key] = value.trim();
    }
  }

  const filled = Object.keys(fill).length;
  if (filled > 0) {
    await db.update(usersTable).set(fill).where(eq(usersTable.id, userId));
  }
  return filled;
}
