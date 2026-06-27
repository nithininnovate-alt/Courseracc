import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { StaffLoginBody } from "@workspace/api-zod";
import {
  signStaffToken,
  staffCookieOptions,
  sanitizeUser,
  isStaff,
  STAFF_COOKIE,
} from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
  const parsed = StaffLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { username, password } = parsed.data;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));
  if (!user || !user.passwordHash || !isStaff(user)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = signStaffToken({ userId: user.id, role: user.role });
  res.cookie(STAFF_COOKIE, token, staffCookieOptions());
  res.json(sanitizeUser(user));
});

router.post("/auth/logout", (_req, res) => {
  res.clearCookie(STAFF_COOKIE, { path: "/" });
  res.json({ success: true });
});

export default router;
