import { Router, type IRouter } from "express";
import { eq, desc, inArray } from "drizzle-orm";
import {
  db,
  applicationsTable,
  applicationDocumentsTable,
  type Application,
  type ApplicationDocument,
} from "@workspace/db";
import { CreateApplicationBody, UpdateApplicationBody } from "@workspace/api-zod";
import { resolveCurrentUser, isStaff, requireStaff } from "../lib/auth";
import {
  sendEmail,
  buildApplicationAcknowledgement,
  buildAdmissionApproval,
  buildAdmissionRejection,
} from "../lib/email";
import { generateAdmissionLetter } from "../lib/admissionLetter";
import { ensureStudentId } from "../lib/studentId";
import { syncApplicationToProfile } from "../lib/profileSync";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

type ApplicationWithDocs = Application & { documents: ApplicationDocument[] };

async function attachDocuments(
  apps: Application[],
): Promise<ApplicationWithDocs[]> {
  if (apps.length === 0) return [];
  const ids = apps.map((a) => a.id);
  const docs = await db
    .select()
    .from(applicationDocumentsTable)
    .where(inArray(applicationDocumentsTable.applicationId, ids))
    .orderBy(desc(applicationDocumentsTable.uploadedAt));
  const byApp = new Map<number, ApplicationDocument[]>();
  for (const d of docs) {
    const list = byApp.get(d.applicationId) ?? [];
    list.push(d);
    byApp.set(d.applicationId, list);
  }
  return apps.map((a) => ({ ...a, documents: byApp.get(a.id) ?? [] }));
}

router.get("/applications", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (isStaff(user)) {
    const rows = await db
      .select()
      .from(applicationsTable)
      .orderBy(desc(applicationsTable.submittedAt));
    res.json(await attachDocuments(rows));
    return;
  }
  if (user) {
    const rows = await db
      .select()
      .from(applicationsTable)
      .where(eq(applicationsTable.userId, user.id))
      .orderBy(desc(applicationsTable.submittedAt));
    res.json(await attachDocuments(rows));
    return;
  }
  res.json([]);
});

router.post("/applications", async (req, res) => {
  const parsed = CreateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const user = await resolveCurrentUser(req);
  const { documents, ...appData } = parsed.data;

  const [created] = await db
    .insert(applicationsTable)
    .values({ ...appData, userId: user?.id ?? null })
    .returning();

  let savedDocs: ApplicationDocument[] = [];
  if (documents && documents.length > 0) {
    savedDocs = await db
      .insert(applicationDocumentsTable)
      .values(
        documents.map((d) => ({
          applicationId: created.id,
          name: d.name,
          type: d.type ?? null,
          objectPath: d.objectPath,
        })),
      )
      .returning();
  }

  const ack = buildApplicationAcknowledgement({
    fullName: created.fullName,
    programName: created.programName,
    applicationId: created.id,
  });
  await sendEmail({ ...ack, to: created.email });

  res.status(201).json({ ...created, documents: savedDocs });
});

router.get("/applications/:id", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = Number(req.params.id);
  const [row] = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  if (!isStaff(user) && row.userId !== user.id) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  const [withDocs] = await attachDocuments([row]);
  res.json(withDocs);
});

router.patch("/applications/:id", requireStaff, async (req, res) => {
  const parsed = UpdateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const id = Number(req.params.id);
  const [existing] = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const { status } = parsed.data;
  const decided = status === "approved" || status === "rejected";

  const updateValues: Partial<typeof applicationsTable.$inferInsert> = {
    status,
    reviewNote: parsed.data.reviewNote ?? existing.reviewNote,
    reviewedAt: decided ? new Date() : existing.reviewedAt,
  };

  // Generate the admission letter PDF on approval and store it.
  if (status === "approved") {
    try {
      const studentId = existing.userId
        ? await ensureStudentId(existing.userId, existing.programName)
        : null;
      const pdfBytes = await generateAdmissionLetter({
        applicantName: existing.fullName,
        studentId,
        programName: existing.programName,
        applicationId: existing.id,
        reviewNote: parsed.data.reviewNote ?? existing.reviewNote,
      });
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const putRes = await fetch(uploadURL, {
        method: "PUT",
        body: Buffer.from(pdfBytes),
        headers: { "Content-Type": "application/pdf" },
      });
      if (!putRes.ok) {
        throw new Error(`Upload failed with status ${putRes.status}`);
      }
      updateValues.admissionLetterUrl =
        objectStorageService.normalizeObjectEntityPath(uploadURL);
    } catch (err) {
      req.log.error({ err }, "Failed to generate/store admission letter");
      res
        .status(500)
        .json({ error: "Failed to generate admission letter" });
      return;
    }
  }

  const [updated] = await db
    .update(applicationsTable)
    .set(updateValues)
    .where(eq(applicationsTable.id, id))
    .returning();

  // On approval, copy the applicant's details into their student profile so
  // they don't have to re-enter them. Only fills fields that are still empty,
  // so anything the student has since edited in their profile is preserved.
  if (status === "approved" && existing.userId) {
    try {
      await syncApplicationToProfile(existing.userId, existing);
    } catch (err) {
      req.log.error({ err }, "Failed to sync application details to profile");
    }
  }

  // Fire decision emails.
  if (status === "approved") {
    const msg = buildAdmissionApproval({
      fullName: updated.fullName,
      programName: updated.programName,
      applicationId: updated.id,
    });
    await sendEmail({ ...msg, to: updated.email });
  } else if (status === "rejected") {
    const msg = buildAdmissionRejection({
      fullName: updated.fullName,
      programName: updated.programName,
      applicationId: updated.id,
      reviewNote: updated.reviewNote,
    });
    await sendEmail({ ...msg, to: updated.email });
  }

  const [withDocs] = await attachDocuments([updated]);
  res.json(withDocs);
});

export default router;
