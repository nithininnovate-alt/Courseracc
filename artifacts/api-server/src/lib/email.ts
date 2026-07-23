import { eq } from "drizzle-orm";
import { db, emailLogsTable } from "@workspace/db";

export interface EmailMessage {
  to: string;
  subject: string;
  /** Logical template identifier, recorded in email_logs.template */
  template: string;
  /** Rendered plain-text body */
  body: string;
  /** Rendered HTML body */
  html: string;
}

const BRAND = {
  name: "Central Global University",
  primary: "#41356b",
  accent: "#c9a227",
  muted: "#6b6480",
};

/**
 * Wrap a sequence of plain paragraphs in a branded, responsive HTML email
 * layout. Lines that are empty in the source text become paragraph breaks.
 */
function renderEmailHtml(opts: {
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  /** Pre-sanitized HTML inserted after the escaped paragraphs (newsletters). */
  rawHtml?: string;
}): string {
  const { heading, paragraphs, cta, rawHtml } = opts;
  const body = paragraphs
    .map((p) =>
      p.trim() === ""
        ? ""
        : `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#2a2438;">${escapeHtml(
            p,
          )}</p>`,
    )
    .join("\n");

  const ctaHtml = cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 24px;"><tr><td style="border-radius:8px;background:${BRAND.primary};">
        <a href="${cta.url}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(
          cta.label,
        )}</a></td></tr></table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f2f8;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f2f8;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:92%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(65,53,107,0.08);">
        <tr><td style="background:${BRAND.primary};padding:28px 40px;">
          <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">${BRAND.name}</span>
          <span style="display:block;margin-top:4px;font-size:12px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;">Office of the Registrar</span>
        </td></tr>
        <tr><td style="height:4px;background:${BRAND.accent};"></td></tr>
        <tr><td style="padding:36px 40px 12px;">
          <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:${BRAND.primary};">${escapeHtml(
            heading,
          )}</h1>
          ${body}
          ${rawHtml ?? ""}
          ${ctaHtml}
        </td></tr>
        <tr><td style="padding:24px 40px 32px;border-top:1px solid #eceaf2;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.muted};">This is an automated message from ${BRAND.name}. Please do not reply directly to this email.</p>
          <p style="margin:8px 0 0;font-size:12px;color:${BRAND.muted};">© ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ------------------------------ transports ------------------------------ */

/**
 * Resolve the sender address for a given provider. Each provider requires a
 * sender it can actually authenticate: SendGrid needs a verified sender
 * (EMAIL_FROM or SENDGRID_FROM), Gmail SMTP sends as the authenticated
 * account, and Resend falls back to its shared onboarding sender.
 */
function fromFor(provider: "sendgrid" | "gmail" | "resend"): string | null {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  switch (provider) {
    case "sendgrid":
      return process.env.SENDGRID_FROM || null;
    case "gmail":
      return process.env.GMAIL_USER
        ? `Central Global University <${process.env.GMAIL_USER}>`
        : null;
    case "resend":
      return "Central Global University <onboarding@resend.dev>";
  }
}

/**
 * Resolve a SendGrid API key: prefers the Replit SendGrid connector (when the
 * user has connected their SendGrid account), falling back to a
 * SENDGRID_API_KEY secret. Returns null when neither is available.
 */
async function getSendGridApiKey(): Promise<string | null> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (hostname && xReplitToken) {
    try {
      const resp = await fetch(
        `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=sendgrid`,
        {
          headers: {
            Accept: "application/json",
            X_REPLIT_TOKEN: xReplitToken,
          },
        },
      );
      if (resp.ok) {
        const data = (await resp.json()) as {
          items?: { settings?: { api_key?: string; secret?: string } }[];
        };
        const settings = data.items?.[0]?.settings;
        const key = settings?.api_key || settings?.secret;
        if (key) return key;
      }
    } catch {
      // Connector not available — fall through to the env secret.
    }
  }
  return process.env.SENDGRID_API_KEY || null;
}

/** Send via the SendGrid HTTP API. Returns null when not configured. */
async function sendViaSendGrid(msg: EmailMessage): Promise<boolean | null> {
  const apiKey = await getSendGridApiKey();
  if (!apiKey) return null;

  const from = fromFor("sendgrid");
  if (!from) {
    console.warn(
      "[email] SendGrid API key found but no verified sender configured — set EMAIL_FROM (or SENDGRID_FROM) to a sender verified in SendGrid. Skipping SendGrid.",
    );
    return null;
  }

  try {
    const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: msg.to }] }],
        from: parseAddress(from),
        subject: msg.subject,
        content: [
          { type: "text/plain", value: msg.body },
          { type: "text/html", value: msg.html },
        ],
      }),
    });
    if (resp.status === 202) return true;
    const detail = await resp.text().catch(() => "");
    console.error(`[email] SendGrid delivery failed (${resp.status}): ${detail}`);
    return false;
  } catch (err) {
    console.error("[email] SendGrid delivery threw", err);
    return false;
  }
}

/** Parse `Name <addr@host>` into SendGrid's {email, name} shape. */
function parseAddress(value: string): { email: string; name?: string } {
  const match = value.match(/^(.*)<([^>]+)>\s*$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, "");
    return { email: match[2].trim(), ...(name ? { name } : {}) };
  }
  return { email: value.trim() };
}

/**
 * Send via Google (Gmail / Google Workspace) SMTP using nodemailer. Requires
 * GMAIL_USER and GMAIL_APP_PASSWORD (a Google "app password", not the account
 * password). Returns null when not configured.
 */
async function sendViaGoogleSmtp(msg: EmailMessage): Promise<boolean | null> {
  const user = process.env.GMAIL_USER?.trim();
  // Google displays app passwords with spaces (xxxx xxxx xxxx xxxx) — strip them.
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) return null;

  try {
    const { default: nodemailer } = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: fromFor("gmail")!,
      to: msg.to,
      subject: msg.subject,
      text: msg.body,
      html: msg.html,
    });
    return true;
  } catch (err) {
    console.error("[email] Google SMTP delivery failed", err);
    return false;
  }
}

/** Send via the Resend HTTP API. Returns null when not configured. */
async function sendViaResend(msg: EmailMessage): Promise<boolean | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromFor("resend"),
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.body,
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.error(`[email] Resend delivery failed (${resp.status}): ${detail}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Resend delivery threw", err);
    return false;
  }
}

type Transport = (msg: EmailMessage) => Promise<boolean | null>;

const TRANSPORTS: Record<string, Transport> = {
  sendgrid: sendViaSendGrid,
  gmail: sendViaGoogleSmtp,
  resend: sendViaResend,
};

/**
 * Deliver an email through the first configured transport.
 *
 * Order: SendGrid → Google SMTP (Gmail / Google Workspace) → Resend. Set
 * EMAIL_PROVIDER=sendgrid|gmail|resend to pin a specific provider. If a
 * configured transport fails, the next configured one is attempted. When no
 * transport is configured (e.g. local development), the rendered message is
 * logged to the server console so the trigger remains observable.
 */
async function deliverEmail(msg: EmailMessage): Promise<boolean> {
  const pinned = (process.env.EMAIL_PROVIDER || "").toLowerCase();
  if (pinned && !TRANSPORTS[pinned]) {
    console.warn(
      `[email] Unknown EMAIL_PROVIDER="${pinned}" — expected sendgrid, gmail, or resend. Using automatic provider selection.`,
    );
  }
  const chain: Transport[] = TRANSPORTS[pinned]
    ? [TRANSPORTS[pinned]]
    : [sendViaSendGrid, sendViaGoogleSmtp, sendViaResend];

  let anyConfigured = false;
  for (const transport of chain) {
    const result = await transport(msg);
    if (result === null) continue; // not configured — try next
    anyConfigured = true;
    if (result) return true;
  }
  if (anyConfigured) return false;
  if (TRANSPORTS[pinned]) {
    console.error(
      `[email] EMAIL_PROVIDER="${pinned}" is set but that provider is not fully configured — delivery failed for to=${msg.to} subject="${msg.subject}".`,
    );
    return false;
  }

  console.log(
    `\n[email] (no email provider configured — logging only) to=${msg.to} subject="${msg.subject}" template=${msg.template}\n${msg.body}\n`,
  );
  return true;
}

/**
 * Send an email and record it to the email_logs table regardless of outcome.
 */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  let status = "queued";
  let sentAt: Date | null = null;
  try {
    const ok = await deliverEmail(msg);
    if (ok) {
      status = "sent";
      sentAt = new Date();
    } else {
      status = "failed";
    }
  } catch {
    status = "failed";
  }

  try {
    await db.insert(emailLogsTable).values({
      recipient: msg.to,
      subject: msg.subject,
      template: msg.template,
      status,
      body: msg.body,
      html: msg.html,
      sentAt,
    });
  } catch (err) {
    console.error("[email] failed to record email log", err);
  }

  return status === "sent";
}

/**
 * Re-attempt delivery of a previously logged email (used by the admin "resend"
 * action). Updates the existing log row with the new status/timestamp. Returns
 * the resulting status, or null if the log id does not exist.
 */
export async function resendEmailLog(id: number): Promise<string | null> {
  const [log] = await db
    .select()
    .from(emailLogsTable)
    .where(eq(emailLogsTable.id, id));
  if (!log) return null;

  const msg: EmailMessage = {
    to: log.recipient,
    subject: log.subject,
    template: log.template,
    body: log.body ?? log.subject,
    html: log.html ?? `<p>${escapeHtml(log.body ?? log.subject)}</p>`,
  };

  let status = "failed";
  let sentAt: Date | null = null;
  try {
    if (await deliverEmail(msg)) {
      status = "sent";
      sentAt = new Date();
    }
  } catch {
    status = "failed";
  }

  await db
    .update(emailLogsTable)
    .set({ status, sentAt })
    .where(eq(emailLogsTable.id, id));
  return status;
}

/* --------------------------- template builders --------------------------- */

function build(opts: {
  to?: string;
  subject: string;
  template: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  signoff?: string[];
}): EmailMessage {
  const signoff = opts.signoff ?? [
    "",
    "Warm regards,",
    "Office of the Registrar",
    BRAND.name,
  ];
  const paragraphs = [...opts.paragraphs, ...signoff];
  return {
    to: opts.to ?? "",
    subject: opts.subject,
    template: opts.template,
    body: paragraphs.join("\n"),
    html: renderEmailHtml({
      heading: opts.heading,
      paragraphs,
      cta: opts.cta,
    }),
  };
}

export function buildWelcome(opts: { fullName: string }): EmailMessage {
  return build({
    subject: `Welcome to ${BRAND.name}`,
    template: "welcome",
    heading: `Welcome, ${opts.fullName}!`,
    paragraphs: [
      `Dear ${opts.fullName},`,
      ``,
      `Your account at ${BRAND.name} has been created successfully. You can now sign in to your student portal to explore programmes, apply for admission, and manage your studies.`,
      `We're thrilled to have you join our global community of learners.`,
    ],
    signoff: ["", "Warm regards,", "Office of Admissions", BRAND.name],
  });
}

/**
 * Newsletter with a rich (already-sanitized) HTML body. The HTML is placed
 * inside the branded layout as-is; callers MUST sanitize it first
 * (see sanitizeNewsletterHtml) and absolutize any relative asset URLs.
 */
export function buildNewsletterHtml(opts: {
  fullName: string;
  subject: string;
  sanitizedHtml: string;
  plainText: string;
}): EmailMessage {
  const greeting = `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#2a2438;">Dear ${escapeHtml(
    opts.fullName,
  )},</p>`;
  const signoffHtml = `<p style="margin:24px 0 16px;font-size:15px;line-height:1.6;color:#2a2438;">Warm regards,<br>${BRAND.name}</p>`;
  const inner = `${greeting}\n<div style="font-size:15px;line-height:1.6;color:#2a2438;">${opts.sanitizedHtml}</div>\n${signoffHtml}`;
  const body = [
    `Dear ${opts.fullName},`,
    ``,
    opts.plainText,
    ``,
    `Warm regards,`,
    BRAND.name,
  ].join("\n");
  return {
    to: "",
    subject: opts.subject,
    template: "newsletter",
    body,
    html: renderEmailHtml({
      heading: opts.subject,
      paragraphs: [],
      rawHtml: inner,
    }),
  };
}

export function buildNewsletter(opts: {
  fullName: string;
  subject: string;
  bodyText: string;
}): EmailMessage {
  // Split the composed body into paragraphs on blank lines so the branded
  // layout renders it as proper paragraphs.
  const paragraphs = opts.bodyText
    .split(/\r?\n/)
    .map((line) => line.trim());
  return build({
    subject: opts.subject,
    template: "newsletter",
    heading: opts.subject,
    paragraphs: [`Dear ${opts.fullName},`, ``, ...paragraphs],
    signoff: ["", "Warm regards,", BRAND.name],
  });
}

export function buildPasswordCreated(opts: { fullName: string }): EmailMessage {
  return build({
    subject: `Your ${BRAND.name} password has been set`,
    template: "password_created",
    heading: "Your password is ready",
    paragraphs: [
      `Dear ${opts.fullName},`,
      ``,
      `This is a confirmation that a password has been set for your ${BRAND.name} account.`,
      `If you did not request this change, please contact our support team immediately.`,
    ],
  });
}

export function buildApplicationAcknowledgement(opts: {
  fullName: string;
  programName: string;
  applicationId: number;
}): EmailMessage {
  const { fullName, programName, applicationId } = opts;
  return build({
    subject: `We received your application — ${programName}`,
    template: "application_acknowledgement",
    heading: "Application received",
    paragraphs: [
      `Dear ${fullName},`,
      ``,
      `Thank you for applying to ${BRAND.name} for the ${programName} programme.`,
      `Your application (reference #${applicationId}) has been received and is now pending review.`,
      ``,
      `You can track your application status anytime from your student dashboard. We will notify you by email as soon as a decision has been made.`,
    ],
    signoff: ["", "Warm regards,", "Office of Admissions", BRAND.name],
  });
}

export function buildAdmissionApproval(opts: {
  fullName: string;
  programName: string;
  applicationId: number;
}): EmailMessage {
  const { fullName, programName, applicationId } = opts;
  return build({
    subject: `Congratulations! Your admission to ${programName} is approved`,
    template: "admission_approved",
    heading: "Your admission is approved 🎉",
    paragraphs: [
      `Dear ${fullName},`,
      ``,
      `We are delighted to inform you that your application (reference #${applicationId}) for the ${programName} programme at ${BRAND.name} has been APPROVED.`,
      ``,
      `Your official admission letter is available for download from your student dashboard. Please review it for your enrollment details and next steps.`,
      ``,
      `Welcome to ${BRAND.name}!`,
    ],
    signoff: ["", "Warm regards,", "Office of Admissions", BRAND.name],
  });
}

export function buildAdmissionRejection(opts: {
  fullName: string;
  programName: string;
  applicationId: number;
  reviewNote?: string | null;
}): EmailMessage {
  const { fullName, programName, applicationId, reviewNote } = opts;
  return build({
    subject: `Update on your application — ${programName}`,
    template: "admission_rejected",
    heading: "Update on your application",
    paragraphs: [
      `Dear ${fullName},`,
      ``,
      `Thank you for your interest in the ${programName} programme at ${BRAND.name}. After careful review of your application (reference #${applicationId}), we regret to inform you that we are unable to offer you admission at this time.`,
      ...(reviewNote ? [``, `Reviewer remarks: ${reviewNote}`] : []),
      ``,
      `We encourage you to apply again in a future intake.`,
    ],
    signoff: ["", "Warm regards,", "Office of Admissions", BRAND.name],
  });
}

export function buildPaymentConfirmation(opts: {
  fullName: string;
  amount: number;
  currency: string;
  courseTitle?: string | null;
  invoiceNumber?: string | null;
}): EmailMessage {
  const { fullName, amount, currency, courseTitle, invoiceNumber } = opts;
  const formatted = `${currency} ${amount.toFixed(2)}`;
  return build({
    subject: `Payment confirmed — ${formatted}`,
    template: "payment_confirmation",
    heading: "Payment received",
    paragraphs: [
      `Dear ${fullName},`,
      ``,
      `We have successfully received your payment of ${formatted}${
        courseTitle ? ` for "${courseTitle}"` : ""
      }.`,
      ...(invoiceNumber ? [`Invoice number: ${invoiceNumber}`] : []),
      ``,
      `Your receipt is available in the Payments section of your student dashboard.`,
    ],
  });
}

export function buildCourseActivation(opts: {
  fullName: string;
  courseTitle: string;
}): EmailMessage {
  const { fullName, courseTitle } = opts;
  return build({
    subject: `Course activated — ${courseTitle}`,
    template: "course_activation",
    heading: "Your course is now active",
    paragraphs: [
      `Dear ${fullName},`,
      ``,
      `Great news — you now have full access to "${courseTitle}".`,
      `You can begin learning right away from the My Learning section of your student dashboard, where you'll find your lectures, study materials, and assignments.`,
    ],
  });
}

export function buildSubmissionReceived(opts: {
  fullName: string;
  assignmentTitle: string;
}): EmailMessage {
  const { fullName, assignmentTitle } = opts;
  return build({
    subject: `We received your submission — ${assignmentTitle}`,
    template: "assignment_submitted",
    heading: "Submission received",
    paragraphs: [
      `Dear ${fullName},`,
      ``,
      `Your submission for "${assignmentTitle}" has been received successfully.`,
      `Your instructor will review it and you'll be notified by email once it has been graded.`,
    ],
  });
}

export function buildSubmissionGraded(opts: {
  fullName: string;
  assignmentTitle: string;
  score: number;
  maxScore: number;
  feedback?: string | null;
}): EmailMessage {
  const { fullName, assignmentTitle, score, maxScore, feedback } = opts;
  return build({
    subject: `Your assignment has been graded — ${assignmentTitle}`,
    template: "assignment_graded",
    heading: "Your assignment was graded",
    paragraphs: [
      `Dear ${fullName},`,
      ``,
      `Your submission for "${assignmentTitle}" has been graded.`,
      ``,
      `Score: ${score} / ${maxScore}`,
      ...(feedback ? [``, `Instructor feedback:`, feedback] : []),
      ``,
      `You can review the full details from your student dashboard.`,
    ],
  });
}

export function buildResultPublished(opts: {
  fullName: string;
  examTitle: string;
  score: number;
  totalMarks: number;
  grade?: string | null;
  passed: boolean;
}): EmailMessage {
  const { fullName, examTitle, score, totalMarks, grade, passed } = opts;
  return build({
    subject: `Your result has been published — ${examTitle}`,
    template: "result_published",
    heading: "Your result is published",
    paragraphs: [
      `Dear ${fullName},`,
      ``,
      `The result for "${examTitle}" has been published.`,
      ``,
      `Score: ${score} / ${totalMarks}`,
      ...(grade ? [`Grade: ${grade}`] : []),
      `Outcome: ${passed ? "PASS" : "FAIL"}`,
      ``,
      `You can view your full results and download your result slip from your student dashboard.`,
    ],
  });
}

export function buildCertificateIssued(opts: {
  fullName: string;
  courseTitle: string;
  certificateType: string;
  certificateNumber: string;
}): EmailMessage {
  const { fullName, courseTitle, certificateType, certificateNumber } = opts;
  const label = certificateType === "transcript" ? "academic transcript" : "certificate";
  return build({
    subject: `Your ${label} is ready — ${courseTitle}`,
    template: "certificate_issued",
    heading: `Your ${label} is ready`,
    paragraphs: [
      `Dear ${fullName},`,
      ``,
      `Your ${label} for "${courseTitle}" has been issued by ${BRAND.name}.`,
      ``,
      `Certificate No.: ${certificateNumber}`,
      ``,
      `You can download it from the Certificates section of your student dashboard, and request a physical copy to be couriered to your address.`,
    ],
  });
}

export function buildCourierDispatched(opts: {
  fullName: string;
  carrier: string;
  trackingNumber: string;
}): EmailMessage {
  const { fullName, carrier, trackingNumber } = opts;
  return build({
    subject: `Your certificate is on its way`,
    template: "courier_dispatched",
    heading: "Your certificate has shipped",
    paragraphs: [
      `Dear ${fullName},`,
      ``,
      `Good news — the physical copy of your certificate has been dispatched.`,
      ``,
      `Carrier: ${carrier}`,
      `Tracking number: ${trackingNumber}`,
      ``,
      `You can track the delivery status from the Certificates section of your student dashboard.`,
    ],
  });
}
