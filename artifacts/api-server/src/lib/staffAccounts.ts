import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "./logger";

interface StaffSpec {
  username: string;
  role: "superadmin" | "admin";
  email: string;
  firstName: string;
  lastName: string;
  passwordEnv: string;
  devFallback: string;
}

const STAFF: StaffSpec[] = [
  {
    username: "superadmin",
    role: "superadmin",
    email: "superadmin@centralglobal.edu",
    firstName: "System",
    lastName: "Owner",
    passwordEnv: "SEED_SUPERADMIN_PASSWORD",
    devFallback: "superadmin123",
  },
  {
    username: "admin",
    role: "admin",
    email: "admin@centralglobal.edu",
    firstName: "Registrar",
    lastName: "Office",
    passwordEnv: "SEED_ADMIN_PASSWORD",
    devFallback: "admin123",
  },
];

/**
 * Ensure the built-in staff accounts exist. Idempotent: never overwrites an
 * existing account or its password. In production the password must come
 * from an environment secret — accounts with missing secrets are skipped
 * with a loud log so the operator knows to set them.
 */
export async function ensureStaffAccounts(): Promise<void> {
  // Treat any deployed environment as production even if NODE_ENV is
  // misconfigured, so dev fallback passwords can never leak into a
  // published app.
  const isProd =
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.REPLIT_DEPLOYMENT);
  for (const spec of STAFF) {
    try {
      const [existing] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.username, spec.username));
      if (existing) continue;

      const secret = process.env[spec.passwordEnv];
      const password = secret ?? (isProd ? null : spec.devFallback);
      if (!password) {
        logger.error(
          { username: spec.username, requiredSecret: spec.passwordEnv },
          "Staff account missing and no password secret set — cannot create it. Set the secret and redeploy.",
        );
        continue;
      }

      await db
        .insert(usersTable)
        .values({
          username: spec.username,
          passwordHash: await bcrypt.hash(password, 10),
          email: spec.email,
          firstName: spec.firstName,
          lastName: spec.lastName,
          role: spec.role,
        })
        .onConflictDoNothing({ target: [usersTable.username] });
      logger.info({ username: spec.username }, "Created staff account");
    } catch (err) {
      logger.error(
        { err, username: spec.username },
        "Failed to ensure staff account",
      );
    }
  }
}
