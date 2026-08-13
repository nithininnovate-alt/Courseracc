import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import { db, studyMaterialsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { toFile } from "openai";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { logger } from "./logger";

/**
 * Automatic content extraction for uploaded study materials.
 *
 * - PDFs: text is extracted with pdf-parse.
 * - Videos/audio: the audio track is compressed with ffmpeg, split into
 *   chunks small enough for the OpenAI transcription API, and transcribed.
 *
 * The result is stored on the material row (extractedText) so the AI study
 * assistant can ground its answers in the actual lesson content.
 */

const MAX_EXTRACTED_CHARS = 120_000;
// Safety caps for a small self-hosted VM: refuse to process oversized files.
const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_MEDIA_BYTES = 1024 * 1024 * 1024; // 1 GB
// OpenAI transcription uploads are capped at 25 MB; 64 kbps mono mp3 is
// ~28.8 MB/hour, so 45-minute segments stay safely under the limit.
const SEGMENT_SECONDS = 45 * 60 * 0.5; // 22.5 min ≈ 10.8 MB per chunk

const objectStorage = new ObjectStorageService();

function guessKind(material: {
  type: string;
  url: string | null;
}): "pdf" | "media" | null {
  const url = (material.url || "").toLowerCase();
  const type = material.type.toLowerCase();
  if (type.includes("pdf") || url.endsWith(".pdf")) return "pdf";
  if (
    type.includes("video") ||
    type.includes("audio") ||
    /\.(mp4|webm|mov|mkv|m4v|mp3|m4a|wav|ogg)$/.test(url)
  ) {
    return "media";
  }
  return null;
}

async function downloadMaterialFile(
  objectPath: string,
  maxBytes: number,
): Promise<Buffer> {
  const file = await objectStorage.getObjectEntityFile(objectPath);
  const [meta] = await file.getMetadata();
  const size = Number(meta.size || 0);
  if (size > maxBytes) {
    throw new Error(
      `file is too large to process (${(size / 1048576).toFixed(0)} MB, limit ${(maxBytes / 1048576).toFixed(0)} MB)`,
    );
  }
  const [contents] = await file.download();
  return contents;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return (result.text || "").replace(/\n{3,}/g, "\n\n").trim();
  } finally {
    await parser.destroy();
  }
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args]);
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString().slice(0, 2000)));
    proc.on("close", (code) => {
      if (code === 0) return resolve();
      if (stderr.includes("does not contain any stream")) {
        return reject(
          new Error("this video has no audio track, so there is nothing to transcribe"),
        );
      }
      reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(0, 500)}`));
    });
    proc.on("error", (err) =>
      reject(
        err.message.includes("ENOENT")
          ? new Error(
              "ffmpeg is not installed on this server (required for video transcription)",
            )
          : err,
      ),
    );
  });
}

async function transcribeMedia(buffer: Buffer): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "cgu-extract-"));
  try {
    const input = join(dir, "input.bin");
    await writeFile(input, buffer);
    // Extract mono 64 kbps mp3 audio, split into chunks under the API limit.
    await runFfmpeg([
      "-i",
      input,
      "-vn",
      "-ac",
      "1",
      "-b:a",
      "64k",
      "-f",
      "segment",
      "-segment_time",
      String(SEGMENT_SECONDS),
      join(dir, "chunk-%03d.mp3"),
    ]);
    const chunks = (await readdir(dir)).filter((f) => f.startsWith("chunk-")).sort();
    if (chunks.length === 0) {
      throw new Error("no audio track found in the file");
    }
    const parts: string[] = [];
    for (const chunk of chunks) {
      const audio = await readFile(join(dir, chunk));
      const file = await toFile(audio, "audio.mp3");
      const res = await openai.audio.transcriptions.create({
        file,
        model: "gpt-4o-mini-transcribe",
      });
      parts.push(res.text.trim());
    }
    return parts.join("\n").trim();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// All extraction runs through a single serial queue so a burst of uploads or
// a backfill can never run many ffmpeg/download jobs at once on a small VM.
let queueTail: Promise<void> = Promise.resolve();

function enqueue(job: () => Promise<void>): Promise<void> {
  const next = queueTail.then(job, job);
  queueTail = next.catch(() => {});
  return next;
}

/**
 * Extract text for one material and persist the result. Never throws — all
 * failures are recorded on the row so admins can retry.
 */
export function extractMaterialContent(materialId: number): Promise<void> {
  return enqueue(() => doExtractMaterialContent(materialId));
}

async function doExtractMaterialContent(materialId: number): Promise<void> {
  const [material] = await db
    .select()
    .from(studyMaterialsTable)
    .where(eq(studyMaterialsTable.id, materialId));
  if (!material) return;

  const kind = material.url?.startsWith("/objects/")
    ? guessKind(material)
    : null;
  if (!kind) {
    await db
      .update(studyMaterialsTable)
      .set({ extractionStatus: "skipped", extractionError: null })
      .where(eq(studyMaterialsTable.id, materialId));
    return;
  }

  await db
    .update(studyMaterialsTable)
    .set({ extractionStatus: "processing", extractionError: null })
    .where(eq(studyMaterialsTable.id, materialId));

  try {
    const buffer = await downloadMaterialFile(
      material.url!,
      kind === "pdf" ? MAX_PDF_BYTES : MAX_MEDIA_BYTES,
    );
    const text =
      kind === "pdf" ? await extractPdfText(buffer) : await transcribeMedia(buffer);
    if (!text) throw new Error("no text could be extracted from the file");
    // Persist only if the material still points at the same file — an admin
    // may have swapped the upload while this (slow) job was running.
    await db
      .update(studyMaterialsTable)
      .set({
        extractedText: text.slice(0, MAX_EXTRACTED_CHARS),
        extractionStatus: "done",
        extractionError: null,
      })
      .where(
        and(
          eq(studyMaterialsTable.id, materialId),
          eq(studyMaterialsTable.url, material.url!),
        ),
      );
    logger.info(
      { materialId, kind, chars: text.length },
      "material content extracted",
    );
  } catch (err) {
    const message =
      err instanceof ObjectNotFoundError
        ? "uploaded file not found in storage"
        : err instanceof Error
          ? err.message
          : String(err);
    logger.error({ err, materialId }, "material content extraction failed");
    await db
      .update(studyMaterialsTable)
      .set({ extractionStatus: "failed", extractionError: message.slice(0, 500) })
      .where(eq(studyMaterialsTable.id, materialId));
  }
}

/** Fire-and-forget trigger used by the material create/update routes. */
export function queueMaterialExtraction(materialId: number): void {
  void extractMaterialContent(materialId).catch((err) =>
    logger.error({ err, materialId }, "material extraction crashed"),
  );
}

let backfillRunning = false;

/**
 * Extract every PDF/video material that has no successful extraction yet.
 * Runs sequentially to keep memory and API usage bounded.
 */
export async function backfillMaterialExtractions(): Promise<{
  queued: number;
}> {
  const materials = await db.select().from(studyMaterialsTable);
  const todo = materials.filter(
    (m) =>
      m.url?.startsWith("/objects/") &&
      guessKind(m) !== null &&
      m.extractionStatus !== "done" &&
      m.extractionStatus !== "processing",
  );
  if (!backfillRunning) {
    backfillRunning = true;
    void (async () => {
      try {
        for (const m of todo) {
          await extractMaterialContent(m.id);
        }
      } finally {
        backfillRunning = false;
      }
    })();
  }
  return { queued: todo.length };
}
