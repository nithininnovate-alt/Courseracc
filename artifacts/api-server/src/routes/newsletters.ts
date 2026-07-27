import { Router, type IRouter } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  db,
  newslettersTable,
  newsletterSubscribersTable,
  usersTable,
  enrollmentsTable,
  type Newsletter,
} from "@workspace/db";
import { SendNewsletterBody, SubscribeToNewsletterBody } from "@workspace/api-zod";
import { requireStaff, type AuthedRequest } from "../lib/auth";
import { sendEmail, buildNewsletter, buildNewsletterHtml } from "../lib/email";
import {
  sanitizeNewsletterHtml,
  absolutizeUrls,
  publicBaseUrl,
  htmlToPlainText,
  hasRelativeUrls,
} from "../lib/newsletterHtml";
import { logger } from "../lib/logger";
import { cleanupOrphanedNewsletterImages } from "../lib/newsletterImageCleanup";

const router: IRouter = Router();

function serializeNewsletter(n: Newsletter) {
  return {
    id: n.id,
    subject: n.subject,
    body: n.body,
    bodyHtml: n.bodyHtml,
    audience: n.audience,
    courseId: n.courseId,
    recipientCount: n.recipientCount,
    sentAt: n.sentAt.toISOString(),
  };
}

// --- Public newsletter signup (embedded on WordPress / external sites) -----

// Lightweight in-memory rate limit: max 10 signups per client per 10 minutes,
// plus a global ceiling so header spoofing cannot flood the table, and a
// bounded map so spoofed identities cannot exhaust memory.
const SIGNUP_WINDOW_MS = 10 * 60 * 1000;
const SIGNUP_MAX_PER_CLIENT = 10;
const SIGNUP_MAX_GLOBAL = 300;
const SIGNUP_MAX_KEYS = 10_000;
const signupHits = new Map<string, { count: number; resetAt: number }>();
let globalWindow = { count: 0, resetAt: 0 };

// The rightmost x-forwarded-for entry is appended by our own trusted proxy
// and cannot be spoofed by the caller (leftmost entries can be).
function clientKeyFor(req: import("express").Request): string {
  const xff = req.headers["x-forwarded-for"];
  const chain = (Array.isArray(xff) ? xff.join(",") : xff ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return chain[chain.length - 1] || req.socket.remoteAddress || "unknown";
}

function signupRateLimited(key: string): boolean {
  const now = Date.now();
  if (now > globalWindow.resetAt) {
    globalWindow = { count: 0, resetAt: now + SIGNUP_WINDOW_MS };
  }
  globalWindow.count += 1;
  if (globalWindow.count > SIGNUP_MAX_GLOBAL) return true;

  // Evict expired entries; if the map is still full, fail closed for new keys.
  if (signupHits.size >= SIGNUP_MAX_KEYS) {
    for (const [k, v] of signupHits) {
      if (now > v.resetAt) signupHits.delete(k);
    }
    if (signupHits.size >= SIGNUP_MAX_KEYS && !signupHits.has(key)) return true;
  }
  const entry = signupHits.get(key);
  if (!entry || now > entry.resetAt) {
    signupHits.set(key, { count: 1, resetAt: now + SIGNUP_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > SIGNUP_MAX_PER_CLIENT;
}

// The form is embedded on third-party origins, so this route must answer
// cross-origin requests. It is intentionally unauthenticated and write-only.
function setSubscribeCors(res: import("express").Response) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

router.options("/newsletter/subscribe", (_req, res) => {
  setSubscribeCors(res);
  res.status(204).end();
});

router.post("/newsletter/subscribe", async (req, res) => {
  setSubscribeCors(res);
  if (signupRateLimited(clientKeyFor(req))) {
    res.status(429).json({ ok: false, message: "Too many requests. Please try again later." });
    return;
  }
  const parsed = SubscribeToNewsletterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, message: "Please enter a valid email address." });
    return;
  }
  const { email, name, source, website } = parsed.data;
  // Honeypot: real users never fill this hidden field. Pretend success.
  if (website && website.trim() !== "") {
    res.json({ ok: true, message: "Thank you for subscribing!" });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  await db
    .insert(newsletterSubscribersTable)
    .values({
      email: normalizedEmail,
      name: name?.trim().slice(0, 200) || null,
      source: source?.trim().slice(0, 200) || null,
      status: "subscribed",
    })
    .onConflictDoUpdate({
      target: newsletterSubscribersTable.email,
      // Re-subscribing refreshes attribution to the latest signup.
      set: {
        status: "subscribed",
        ...(name?.trim() ? { name: name.trim().slice(0, 200) } : {}),
        ...(source?.trim() ? { source: source.trim().slice(0, 200) } : {}),
      },
    });
  res.json({ ok: true, message: "Thank you for subscribing!" });
});

router.get("/newsletter-subscribers", requireStaff, async (_req, res) => {
  const rows = await db
    .select()
    .from(newsletterSubscribersTable)
    .orderBy(desc(newsletterSubscribersTable.createdAt));
  res.json(
    rows.map((s) => ({
      id: s.id,
      email: s.email,
      name: s.name,
      source: s.source,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
    })),
  );
});

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
    // Sanitize admin-composed HTML server-side (allowlist) and store the
    // sanitized version so previews can render it safely.
    const sanitizedHtml = parsed.data.bodyHtml
      ? sanitizeNewsletterHtml(parsed.data.bodyHtml)
      : null;
    // Email clients need absolute URLs for embedded images.
    const baseUrl = publicBaseUrl();
    const emailHtml = sanitizedHtml
      ? absolutizeUrls(sanitizedHtml, baseUrl)
      : null;
    if (emailHtml && !baseUrl && hasRelativeUrls(emailHtml)) {
      res.status(500).json({
        error:
          "Cannot send: newsletter contains images/links with relative URLs but no public domain is configured.",
      });
      return;
    }
    const plainText = sanitizedHtml ? htmlToPlainText(sanitizedHtml) : body;
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
        const message = emailHtml
          ? buildNewsletterHtml({
              fullName,
              subject,
              sanitizedHtml: emailHtml,
              plainText,
            })
          : buildNewsletter({ fullName, subject, bodyText: body });
        const delivered = await sendEmail({ ...message, to: r.email });
        if (delivered) sent += 1;
      } catch (err) {
        logger.error({ err, to: r.email }, "Newsletter send failed");
      }
    }

    const [saved] = await db
      .insert(newslettersTable)
      .values({
        subject,
        body: plainText,
        bodyHtml: sanitizedHtml,
        audience,
        courseId: audience === "course" ? courseId : null,
        recipientCount: sent,
        sentById: req.currentUser?.id ?? null,
      })
      .returning();

    res.status(201).json(serializeNewsletter(saved));

    // Best-effort cleanup pass: remove week-old newsletter images that no
    // stored newsletter references (uploads from abandoned drafts).
    cleanupOrphanedNewsletterImages().catch((err) =>
      logger.warn({ err }, "Newsletter image cleanup failed"),
    );
  },
);

export default router;
