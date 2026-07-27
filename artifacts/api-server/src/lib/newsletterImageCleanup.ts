import { newslettersTable, db } from "@workspace/db";
import { ObjectStorageService, objectStorageClient } from "./objectStorage";
import { logger } from "./logger";

/**
 * Newsletter editor images are uploaded to public object storage under
 * `newsletter-images/` BEFORE the newsletter is sent. If the admin abandons
 * the draft, those files linger forever. This cleanup pass deletes objects
 * under that prefix that are (a) older than MIN_AGE and (b) not referenced by
 * any stored newsletter bodyHtml.
 *
 * The age threshold protects images belonging to drafts still being composed
 * (drafts are not persisted server-side, so recency is the only safe signal).
 */
const NEWSLETTER_IMAGE_PREFIX = "newsletter-images";
const MIN_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Extract referenced newsletter-image object names from stored bodyHtml. */
export function extractReferencedImageNames(htmls: (string | null)[]): Set<string> {
  const referenced = new Set<string>();
  // Match both relative ("/api/storage/public-objects/newsletter-images/<id>")
  // and absolutized ("https://host/api/storage/public-objects/...") forms.
  const re = new RegExp(
    `/public-objects/(${NEWSLETTER_IMAGE_PREFIX}/[A-Za-z0-9_.-]+)`,
    "g",
  );
  for (const html of htmls) {
    if (!html) continue;
    for (const m of html.matchAll(re)) {
      referenced.add(m[1]);
    }
  }
  return referenced;
}

let cleanupRunning = false;

/**
 * Delete orphaned newsletter images. Safe to call opportunistically (e.g.
 * after each newsletter send); overlapping invocations are skipped.
 */
export async function cleanupOrphanedNewsletterImages(
  minAgeMs: number = MIN_AGE_MS,
): Promise<{ scanned: number; deleted: number }> {
  if (cleanupRunning) return { scanned: 0, deleted: 0 };
  cleanupRunning = true;
  try {
    const svc = new ObjectStorageService();
    const rows = await db
      .select({ bodyHtml: newslettersTable.bodyHtml })
      .from(newslettersTable);
    const referenced = extractReferencedImageNames(rows.map((r) => r.bodyHtml));

    const cutoff = Date.now() - minAgeMs;
    let scanned = 0;
    let deleted = 0;

    for (const searchPath of svc.getPublicObjectSearchPaths()) {
      const normalized = searchPath.startsWith("/") ? searchPath : `/${searchPath}`;
      const parts = normalized.split("/");
      const bucketName = parts[1];
      const basePrefix = parts.slice(2).join("/");
      const prefix = basePrefix
        ? `${basePrefix}/${NEWSLETTER_IMAGE_PREFIX}/`
        : `${NEWSLETTER_IMAGE_PREFIX}/`;

      const [files] = await objectStorageClient
        .bucket(bucketName)
        .getFiles({ prefix });

      for (const file of files) {
        scanned += 1;
        // Path relative to the search path, e.g. "newsletter-images/<uuid>".
        const relative = basePrefix
          ? file.name.slice(basePrefix.length + 1)
          : file.name;
        if (referenced.has(relative)) continue;

        const created = file.metadata.timeCreated
          ? Date.parse(String(file.metadata.timeCreated))
          : NaN;
        // If we can't determine age, err on the side of keeping the file.
        if (!Number.isFinite(created) || created > cutoff) continue;

        try {
          await file.delete();
          deleted += 1;
        } catch (err) {
          logger.warn(
            { err, object: file.name },
            "Failed to delete orphaned newsletter image",
          );
        }
      }
    }

    if (deleted > 0) {
      logger.info({ scanned, deleted }, "Cleaned up orphaned newsletter images");
    }
    return { scanned, deleted };
  } finally {
    cleanupRunning = false;
  }
}
