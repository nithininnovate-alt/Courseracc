import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { UpdateUserRoleBody } from "@workspace/api-zod";
import {
  resolveCurrentUser,
  requireStaff,
  sanitizeUser,
  type AuthedRequest,
} from "../lib/auth";

const router: IRouter = Router();

router.get("/users/me", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(sanitizeUser(user));
});

router.get("/users", requireStaff, async (_req, res) => {
  const rows = await db.select().from(usersTable);
  res.json(rows.map(sanitizeUser));
});

router.patch("/users/:id/role", requireStaff, async (req: AuthedRequest, res) => {
  if (req.currentUser?.role !== "superadmin") {
    res.status(403).json({ error: "Only a superadmin can change roles" });
    return;
  }
  const parsed = UpdateUserRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const id = Number(req.params.id);
  const [updated] = await db
    .update(usersTable)
    .set({ role: parsed.data.role })
    .where(eq(usersTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(sanitizeUser(updated));
});

export default router;
