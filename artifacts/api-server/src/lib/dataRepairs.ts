import { like, and, eq } from "drizzle-orm";
import { db, studyMaterialsTable } from "@workspace/db";
import { logger } from "./logger";

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
}
