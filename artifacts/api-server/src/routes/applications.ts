import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, applicationsTable } from "@workspace/db";
import { CreateApplicationBody, UpdateApplicationBody } from "@workspace/api-zod";
import { resolveCurrentUser, isStaff, requireStaff } from "../lib/auth";

const router: IRouter = Router();

router.get("/applications", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (isStaff(user)) {
    const rows = await db
      .select()
      .from(applicationsTable)
      .orderBy(desc(applicationsTable.submittedAt));
    res.json(rows);
    return;
  }
  if (user) {
    const rows = await db
      .select()
      .from(applicationsTable)
      .where(eq(applicationsTable.userId, user.id))
      .orderBy(desc(applicationsTable.submittedAt));
    res.json(rows);
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
  const [created] = await db
    .insert(applicationsTable)
    .values({ ...parsed.data, userId: user?.id ?? null })
    .returning();
  res.status(201).json(created);
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
  res.json(row);
});

router.patch("/applications/:id", requireStaff, async (req, res) => {
  const parsed = UpdateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const id = Number(req.params.id);
  const [updated] = await db
    .update(applicationsTable)
    .set(parsed.data)
    .where(eq(applicationsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  res.json(updated);
});

export default router;
