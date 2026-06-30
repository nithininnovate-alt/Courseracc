import { db, emailLogsTable } from "@workspace/db";

export interface EmailMessage {
  to: string;
  subject: string;
  /** Logical template identifier, recorded in email_logs.template */
  template: string;
  /** Rendered plain-text body */
  body: string;
}

/**
 * Pluggable email transport.
 *
 * No external email provider is wired up in this task — delivery infrastructure
 * (Resend/SMTP) is owned by the dedicated "Email Automation & AI Assistant"
 * task. Until then we log the rendered message to the server console so the
 * trigger is observable, and every message is persisted to the `email_logs`
 * table (surfaced in the admin Emails panel). Swapping in a real provider only
 * requires replacing the body of this function.
 */
async function deliverEmail(msg: EmailMessage): Promise<boolean> {
  console.log(
    `\n[email] to=${msg.to} subject="${msg.subject}" template=${msg.template}\n${msg.body}\n`,
  );
  return true;
}

/**
 * Send an email and record it to the email_logs table regardless of outcome.
 */
export async function sendEmail(msg: EmailMessage): Promise<void> {
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
      sentAt,
    });
  } catch (err) {
    console.error("[email] failed to record email log", err);
  }
}

export function buildApplicationAcknowledgement(opts: {
  fullName: string;
  programName: string;
  applicationId: number;
}): EmailMessage {
  const { fullName, programName, applicationId } = opts;
  return {
    to: "", // filled by caller
    subject: `We received your application — ${programName}`,
    template: "application_acknowledgement",
    body: [
      `Dear ${fullName},`,
      ``,
      `Thank you for applying to Central Global University for the ${programName} programme.`,
      `Your application (reference #${applicationId}) has been received and is now pending review.`,
      ``,
      `You can track your application status anytime from your student dashboard.`,
      `We will notify you by email as soon as a decision has been made.`,
      ``,
      `Warm regards,`,
      `Office of Admissions`,
      `Central Global University`,
    ].join("\n"),
  };
}

export function buildAdmissionApproval(opts: {
  fullName: string;
  programName: string;
  applicationId: number;
}): EmailMessage {
  const { fullName, programName, applicationId } = opts;
  return {
    to: "",
    subject: `Congratulations! Your admission to ${programName} is approved`,
    template: "admission_approved",
    body: [
      `Dear ${fullName},`,
      ``,
      `We are delighted to inform you that your application (reference #${applicationId}) for the`,
      `${programName} programme at Central Global University has been APPROVED.`,
      ``,
      `Your official admission letter is attached and is also available for download from your`,
      `student dashboard. Please review it for your enrollment details and next steps.`,
      ``,
      `Welcome to Central Global University!`,
      ``,
      `Warm regards,`,
      `Office of Admissions`,
    ].join("\n"),
  };
}

export function buildSubmissionGraded(opts: {
  fullName: string;
  assignmentTitle: string;
  score: number;
  maxScore: number;
  feedback?: string | null;
}): EmailMessage {
  const { fullName, assignmentTitle, score, maxScore, feedback } = opts;
  return {
    to: "",
    subject: `Your assignment has been graded — ${assignmentTitle}`,
    template: "assignment_graded",
    body: [
      `Dear ${fullName},`,
      ``,
      `Your submission for "${assignmentTitle}" has been graded.`,
      ``,
      `Score: ${score} / ${maxScore}`,
      ...(feedback ? [``, `Instructor feedback:`, feedback] : []),
      ``,
      `You can review the full details from your student dashboard.`,
      ``,
      `Warm regards,`,
      `Office of the Registrar`,
      `Central Global University`,
    ].join("\n"),
  };
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
  return {
    to: "",
    subject: `Your result has been published — ${examTitle}`,
    template: "result_published",
    body: [
      `Dear ${fullName},`,
      ``,
      `The result for "${examTitle}" has been published.`,
      ``,
      `Score: ${score} / ${totalMarks}`,
      ...(grade ? [`Grade: ${grade}`] : []),
      `Outcome: ${passed ? "PASS" : "FAIL"}`,
      ``,
      `You can view your full results and download your result slip from your`,
      `student dashboard.`,
      ``,
      `Warm regards,`,
      `Office of the Registrar`,
      `Central Global University`,
    ].join("\n"),
  };
}

export function buildAdmissionRejection(opts: {
  fullName: string;
  programName: string;
  applicationId: number;
  reviewNote?: string | null;
}): EmailMessage {
  const { fullName, programName, applicationId, reviewNote } = opts;
  return {
    to: "",
    subject: `Update on your application — ${programName}`,
    template: "admission_rejected",
    body: [
      `Dear ${fullName},`,
      ``,
      `Thank you for your interest in the ${programName} programme at Central Global University.`,
      `After careful review of your application (reference #${applicationId}), we regret to inform`,
      `you that we are unable to offer you admission at this time.`,
      ...(reviewNote ? [``, `Reviewer remarks: ${reviewNote}`] : []),
      ``,
      `We encourage you to apply again in a future intake.`,
      ``,
      `Warm regards,`,
      `Office of Admissions`,
    ].join("\n"),
  };
}
