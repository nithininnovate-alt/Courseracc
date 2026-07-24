import { like, and, eq, isNotNull } from "drizzle-orm";
import { db, studyMaterialsTable, applicationsTable } from "@workspace/db";
import { logger } from "./logger";
import { syncApplicationToProfile } from "./profileSync";

/**
 * One-time data repairs applied at startup (development and production).
 *
 * Seeded lecture videos originally pointed at Google's public sample bucket
 * (gtv-videos-bucket), which now returns 403 Forbidden — so every video
 * player rendered a black, never-loading screen. Repoint those rows at the
 * sample video hosted in our own object storage, which is served through
 * /api/storage/objects/... with Range support and access control.
 */
export async function runDataRepairs(): Promise<void> {
  try {
    const result = await db
      .update(studyMaterialsTable)
      .set({ url: "/objects/videos/sample-lecture.mp4" })
      .where(
        and(
          eq(studyMaterialsTable.type, "video"),
          like(
            studyMaterialsTable.url,
            "https://storage.googleapis.com/gtv-videos-bucket%",
          ),
        ),
      );
    const count = (result as { rowCount?: number }).rowCount ?? 0;
    if (count > 0) {
      logger.info({ count }, "Repaired broken sample video URLs");
    }

    // The w3.org sample PDF sends a frame-ancestors CSP that blocks embedding
    // it in the portal's PDF viewer, so repoint those rows at our own copy.
    const pdfResult = await db
      .update(studyMaterialsTable)
      .set({ url: "/objects/docs/sample-lecture-notes.pdf" })
      .where(
        and(
          eq(studyMaterialsTable.type, "pdf"),
          like(studyMaterialsTable.url, "https://www.w3.org/%"),
        ),
      );
    const pdfCount = (pdfResult as { rowCount?: number }).rowCount ?? 0;
    if (pdfCount > 0) {
      logger.info({ count: pdfCount }, "Repaired blocked sample PDF URLs");
    }
  } catch (err) {
    logger.error({ err }, "Data repair failed");
  }

  // Backfill: applications approved before approval-time profile sync existed
  // left student profiles empty. Copy the submitted details into each linked
  // profile, filling only fields that are still empty so nothing the student
  // has edited is overwritten. Idempotent — once fields are filled, later
  // runs are no-ops.
  try {
    const approved = await db
      .select()
      .from(applicationsTable)
      .where(
        and(
          eq(applicationsTable.status, "approved"),
          isNotNull(applicationsTable.userId),
        ),
      );
    let usersUpdated = 0;
    let fieldsFilled = 0;
    for (const app of approved) {
      const filled = await syncApplicationToProfile(app.userId!, app);
      if (filled > 0) {
        usersUpdated += 1;
        fieldsFilled += filled;
      }
    }
    if (usersUpdated > 0) {
      logger.info(
        { usersUpdated, fieldsFilled },
        "Backfilled student profiles from approved applications",
      );
    }
  } catch (err) {
    logger.error({ err }, "Profile backfill from approved applications failed");
  }
}
