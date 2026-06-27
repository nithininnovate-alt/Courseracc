import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getAuth, clerkClient } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set for staff authentication");
}

export const STAFF_COOKIE = "cgu_staff_session";

type DbUser = typeof usersTable.$inferSelect;
export type SafeUser = Omit<DbUser, "passwordHash">;

export interface AuthedRequest extends Request {
  currentUser?: DbUser;
}

export function signStaffToken(payload: { userId: number; role: string }): string {
  return jwt.sign(payload, SESSION_SECRET as string, { expiresIn: "7d" });
}

export function staffCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

export function sanitizeUser(user: DbUser): SafeUser {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

export function isStaff(user: DbUser | null | undefined): boolean {
  return user?.role === "admin" || user?.role === "superadmin";
}

export async function resolveCurrentUser(req: Request): Promise<DbUser | null> {
  const token = (req as Request & { cookies?: Record<string, string> }).cookies?.[
    STAFF_COOKIE
  ];
  if (token) {
    try {
      const decoded = jwt.verify(token, SESSION_SECRET as string) as {
        userId: number;
      };
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, decoded.userId));
      if (user) return user;
    } catch {
      // invalid/expired staff token — fall through to Clerk
    }
  }

  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (clerkId) {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkId));
    if (existing) return existing;

    const clerkUser = await clerkClient.users.getUser(clerkId);
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses?.[0]?.emailAddress ??
      `${clerkId}@students.cgu`;
    const [created] = await db
      .insert(usersTable)
      .values({
        clerkId,
        email,
        firstName: clerkUser.firstName ?? null,
        lastName: clerkUser.lastName ?? null,
        role: "student",
        avatarUrl: clerkUser.imageUrl ?? null,
      })
      .returning();
    return created;
  }

  return null;
}

export async function requireUser(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = await resolveCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.currentUser = user;
  next();
}

export async function requireStaff(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = await resolveCurrentUser(req);
  if (!isStaff(user)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.currentUser = user ?? undefined;
  next();
}
