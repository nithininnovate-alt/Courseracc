import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getAuth, clerkClient } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendEmail, buildWelcome, buildPasswordCreated } from "./email";

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

async function resolveStaffCookieUser(req: Request): Promise<DbUser | null> {
  const token = (req as Request & { cookies?: Record<string, string> }).cookies?.[
    STAFF_COOKIE
  ];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, SESSION_SECRET as string) as {
      userId: number;
    };
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId));
    return user ?? null;
  } catch {
    // invalid/expired staff token
    return null;
  }
}

async function resolveClerkUser(req: Request): Promise<DbUser | null> {
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

    // A Clerk-authenticated student sets their password during sign-up; the
    // first authenticated request is when the server first observes the new
    // account. Registration (welcome) and password creation happen together at
    // this moment, so we send both lifecycle confirmations here. Best-effort —
    // email delivery must never block authentication.
    if (created.email) {
      const fullName =
        [created.firstName, created.lastName].filter(Boolean).join(" ") ||
        created.email;
      void sendEmail({
        ...buildWelcome({ fullName }),
        to: created.email,
      }).catch((err) => console.error("[email] welcome send failed", err));
      void sendEmail({
        ...buildPasswordCreated({ fullName }),
        to: created.email,
      }).catch((err) =>
        console.error("[email] password-created send failed", err),
      );
    }

    return created;
  }

  return null;
}

/**
 * Resolve the current user. The Clerk session (student identity) takes
 * precedence over the staff cookie so that a lingering admin session in the
 * same browser can never leak another user's data into student pages.
 *
 * Exception: requests from the admin console send an `X-Portal: admin`
 * header; for those, a valid staff cookie wins so admins with a coexisting
 * Clerk session keep full admin visibility on shared endpoints. The header
 * alone grants nothing — it only changes precedence, and elevation still
 * requires a valid staff session cookie for an actual staff user.
 */
export async function resolveCurrentUser(req: Request): Promise<DbUser | null> {
  if (req.get("x-portal") === "admin") {
    const staffUser = await resolveStaffCookieUser(req);
    if (isStaff(staffUser)) return staffUser;
  }
  const clerkUser = await resolveClerkUser(req);
  if (clerkUser) return clerkUser;
  return resolveStaffCookieUser(req);
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
  // Staff cookie first: admin console logins are cookie-based and must keep
  // working even when a Clerk (student) session exists in the same browser.
  let user = await resolveStaffCookieUser(req);
  if (!isStaff(user)) user = await resolveClerkUser(req);
  if (!isStaff(user)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.currentUser = user ?? undefined;
  next();
}
