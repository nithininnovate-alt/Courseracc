import { Router, type IRouter } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  db,
  newslettersTable,
  usersTable,
  enrollmentsTable,
  type Newsletter,
} from "@workspace/db";
import { SendNewsletterBody } from "@workspace/api-zod";
import { requireStaff, type AuthedRequest } from "../lib/auth";
import { sendEmail, buildNewsletter } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function serializeNewsletter(n: Newsletter) {
  return {
    id: n.id,
    subject: n.subject,
    body: n.body,
    audience: n.audience,
    courseId: n.courseId,
    recipientCount: n.recipientCount,
    sentAt: n.sentAt.toISOString(),
  };
}

router.get("/newsletters", requireStaff, async (_req, res) => {
  const rows = await db
    .select()
    .from(newslettersTable)
    .orderBy(desc(newslettersTable.sentAt));
  res.json(rows.map(serializeNewsletter));
});

router.post(
  "/newsletters",
  requireStaff,
  async (req: AuthedRequest, res) => {
    const parsed = SendNewsletterBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const { subject, body, audience, courseId } = parsed.data;
    if (audience === "course" && courseId == null) {
      res.status(400).json({ error: "Select a course for this audience" });
      return;
    }

    // Resolve recipients: every student, or students enrolled in one course.
    let recipients: { email: string; firstName: string | null; lastName: string | null }[];
    if (audience === "course") {
      const enrolled = await db
        .select({ userId: enrollmentsTable.userId })
        .from(enrollmentsTable)
        .where(eq(enrollmentsTable.courseId, courseId!));
      const userIds = [...new Set(enrolled.map((e) => e.userId))];
      recipients = userIds.length
        ? await db
            .select({
              email: usersTable.email,
              firstName: usersTable.firstName,
              lastName: usersTable.lastName,
            })
            .from(usersTable)
            .where(
              and(
                inArray(usersTable.id, userIds),
                eq(usersTable.role, "student"),
              ),
            )
        : [];
    } else {
      recipients = await db
        .select({
          email: usersTable.email,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
        })
        .from(usersTable)
        .where(eq(usersTable.role, "student"));
    }
    recipients = recipients.filter((r) => r.email);

    if (recipients.length === 0) {
      res.status(400).json({ error: "No recipients match this audience" });
      return;
    }

    let sent = 0;
    for (const r of recipients) {
      const fullName =
        [r.firstName, r.lastName].filter(Boolean).join(" ") || "Student";
      try {
        const delivered = await sendEmail({
          ...buildNewsletter({ fullName, subject, bodyText: body }),
          to: r.email,
        });
        if (delivered) sent += 1;
      } catch (err) {
        logger.error({ err, to: r.email }, "Newsletter send failed");
      }
    }

    const [saved] = await db
      .insert(newslettersTable)
      .values({
        subject,
        body,
        audience,
        courseId: audience === "course" ? courseId : null,
        recipientCount: sent,
        sentById: req.currentUser?.id ?? null,
      })
      .returning();

    res.status(201).json(serializeNewsletter(saved));
  },
);

export default router;
