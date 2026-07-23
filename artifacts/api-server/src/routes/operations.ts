import { Router, type IRouter } from "express";
import { and, eq, asc, desc, inArray } from "drizzle-orm";
import {
  db,
  paymentsTable,
  paymentPlansTable,
  coursesTable,
  usersTable,
  certificatesTable,
  emailLogsTable,
  courierTrackingTable,
  enrollmentsTable,
  subjectsTable,
  examsTable,
  resultsTable,
} from "@workspace/db";
import {
  CreatePaymentBody,
  CreatePaypalOrderBody,
  CapturePaypalOrderBody,
  CreateBogOrderBody,
  CompleteBogPaymentBody,
  CreatePaymentPlanBody,
  UpdatePaymentPlanBody,
  IssueCertificateBody,
  RequestCourierBody,
  UpdateCourierBody,
} from "@workspace/api-zod";
import {
  resolveCurrentUser,
  isStaff,
  requireUser,
  requireStaff,
  type AuthedRequest,
} from "../lib/auth";
import { isPaypalConfigured, createOrder, captureOrder } from "../lib/paypal";
import {
  isBogConfigured,
  createBogOrder,
  getBogPaymentDetails,
  verifyBogCallbackSignature,
} from "../lib/bog";
import { generateInvoice } from "../lib/invoice";
import {
  generateDegreeCertificate,
  generateTranscript,
  GRADE_POINTS,
  letterGradeFromPercent,
  type TranscriptRow,
} from "../lib/certificate";
import {
  sendEmail,
  resendEmailLog,
  buildCertificateIssued,
  buildCourierDispatched,
  buildPaymentConfirmation,
  buildCourseActivation,
} from "../lib/email";
import { ensureEnrollment, getPlanStatus } from "../lib/access";
import { ensureStudentId } from "../lib/studentId";

const router: IRouter = Router();

type PaymentRow = typeof paymentsTable.$inferSelect;
function serializePayment(p: PaymentRow) {
  return { ...p, amount: Number(p.amount) };
}

type PlanRow = typeof paymentPlansTable.$inferSelect;
function serializePlan(p: PlanRow) {
  return {
    ...p,
    installmentAmount: Number(p.installmentAmount),
    totalAmount: Number(p.totalAmount),
  };
}

function makeInvoiceNumber(id: number, date: Date): string {
  return `INV-${date.getFullYear()}-${String(id).padStart(5, "0")}`;
}

// Work out how much the user owes next for a course: the next installment on
// an in-progress plan, the first installment of a chosen plan, or the legacy
// one-time course price. Shared by all checkout providers.
type PaymentDue =
  | {
      ok: true;
      amount: number;
      planId: number | null;
      installmentIndex: number;
      installmentCount: number;
      course: typeof coursesTable.$inferSelect;
    }
  | { ok: false; status: number; error: string };

async function derivePaymentDue(
  userId: number,
  courseId: number,
  planId: number | null | undefined,
): Promise<PaymentDue> {
  const [course] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, courseId));
  if (!course) {
    return { ok: false, status: 404, error: "Course not found" };
  }

  const completedRows = await db
    .select()
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.userId, userId),
        eq(paymentsTable.courseId, courseId),
        eq(paymentsTable.status, "completed"),
      ),
    );

  let amount: number;
  let usePlanId: number | null = null;
  let installmentIndex = 1;
  let installmentCount = 1;

  if (completedRows.length > 0) {
    // Continuing an existing purchase — derive the next installment due.
    const existingPlanId =
      completedRows.find((p) => p.planId != null)?.planId ?? null;
    if (existingPlanId == null) {
      return {
        ok: false,
        status: 400,
        error: "You already have full access to this course",
      };
    }
    const [plan] = await db
      .select()
      .from(paymentPlansTable)
      .where(eq(paymentPlansTable.id, existingPlanId));
    if (!plan) {
      return { ok: false, status: 400, error: "Payment plan no longer exists" };
    }
    const paidForPlan = completedRows.filter(
      (p) => p.planId === existingPlanId,
    ).length;
    if (paidForPlan >= plan.installmentCount) {
      return { ok: false, status: 400, error: "This plan is already fully paid" };
    }
    amount = Number(plan.installmentAmount);
    usePlanId = plan.id;
    installmentIndex = paidForPlan + 1;
    installmentCount = plan.installmentCount;
  } else if (planId != null) {
    // First payment on a chosen plan.
    const [plan] = await db
      .select()
      .from(paymentPlansTable)
      .where(eq(paymentPlansTable.id, planId));
    if (!plan || plan.courseId !== courseId) {
      return { ok: false, status: 400, error: "Invalid payment plan" };
    }
    amount = Number(plan.installmentAmount);
    usePlanId = plan.id;
    installmentIndex = 1;
    installmentCount = plan.installmentCount;
  } else {
    // Legacy one-time payment at the course price.
    amount = Number(course.price);
  }

  if (amount <= 0) {
    return { ok: false, status: 400, error: "This course is free" };
  }
  return {
    ok: true,
    amount,
    planId: usePlanId,
    installmentIndex,
    installmentCount,
    course,
  };
}

/**
 * Whether this pending payment's installment slot has already been satisfied
 * by another completed payment (double-click, reload, duplicate order).
 */
async function isDuplicateOfCompleted(
  payment: PaymentRow,
): Promise<boolean> {
  if (!payment.courseId) return false;
  const priorCompleted = await db
    .select()
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.userId, payment.userId),
        eq(paymentsTable.courseId, payment.courseId),
        eq(paymentsTable.status, "completed"),
      ),
    );
  return payment.planId == null
    ? priorCompleted.some((p) => p.planId == null)
    : priorCompleted.filter((p) => p.planId === payment.planId).length >=
        (payment.installmentIndex ?? 1);
}

/**
 * Generate the invoice PDF for a completed payment. Shared by the download
 * route and the confirmation-email attachment. Throws on failure — callers
 * that must not block (email attachment) catch and continue.
 */
async function generateInvoicePdfForPayment(
  payment: PaymentRow,
  opts?: {
    student?: typeof usersTable.$inferSelect | undefined;
    courseTitle?: string | null;
  },
): Promise<{ pdf: Uint8Array; invoiceNumber: string }> {
  let student = opts?.student;
  if (!student) {
    [student] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payment.userId));
  }
  let courseTitle = opts?.courseTitle ?? null;
  if (!courseTitle && payment.courseId) {
    const [course] = await db
      .select({ title: coursesTable.title })
      .from(coursesTable)
      .where(eq(coursesTable.id, payment.courseId));
    courseTitle = course?.title ?? null;
  }
  let installmentLabel: string | null = null;
  if (payment.planId != null) {
    const [plan] = await db
      .select()
      .from(paymentPlansTable)
      .where(eq(paymentPlansTable.id, payment.planId));
    if (plan) {
      installmentLabel = `Installment ${payment.installmentIndex ?? 1} of ${plan.installmentCount}`;
    }
  }
  const invoiceNumber =
    payment.invoiceNumber ?? makeInvoiceNumber(payment.id, payment.createdAt);
  const studentName =
    [student?.firstName, student?.lastName].filter(Boolean).join(" ") ||
    student?.email ||
    "Student";
  const pdf = await generateInvoice({
    invoiceNumber,
    studentName,
    studentEmail: student?.email ?? "",
    courseTitle: courseTitle ?? "Course Enrollment",
    amount: Number(payment.amount),
    currency: payment.currency,
    status: payment.status,
    provider: payment.provider,
    reference: payment.reference,
    date: payment.createdAt,
    installmentLabel,
  });
  return { pdf, invoiceNumber };
}

/**
 * Mark a pending payment completed and run all side effects: invoice number,
 * enrollment activation, and confirmation emails. Uses a compare-and-set on
 * status so concurrent finalizers (e.g. bank callback racing the browser's
 * complete call) run side effects exactly once — returns null when another
 * caller already finalized this payment. Shared by all checkout providers.
 */
async function finalizeCompletedPayment(
  payment: PaymentRow,
  reference: string,
): Promise<PaymentRow | null> {
  const invoiceNumber = makeInvoiceNumber(payment.id, new Date());
  const [updated] = await db
    .update(paymentsTable)
    .set({ status: "completed", invoiceNumber, reference })
    .where(
      and(
        eq(paymentsTable.id, payment.id),
        eq(paymentsTable.status, "pending"),
      ),
    )
    .returning();
  if (!updated) return null;

  const [student] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, payment.userId));
  const studentEmail = student?.email;
  const fullName =
    [student?.firstName, student?.lastName].filter(Boolean).join(" ") ||
    studentEmail ||
    "Student";

  let course: { title: string } | undefined;
  let newlyEnrolled = false;
  if (payment.courseId) {
    newlyEnrolled = await ensureEnrollment(payment.userId, payment.courseId);
    [course] = await db
      .select({ title: coursesTable.title })
      .from(coursesTable)
      .where(eq(coursesTable.id, payment.courseId));
  }

  if (studentEmail) {
    // Attach the invoice PDF; never block finalization on generation failure.
    let attachments: { filename: string; content: Buffer; contentType: string }[] | undefined;
    try {
      const { pdf } = await generateInvoicePdfForPayment(updated, {
        student: student ?? undefined,
        courseTitle: course?.title ?? null,
      });
      attachments = [
        {
          filename: `${invoiceNumber}.pdf`,
          content: Buffer.from(pdf),
          contentType: "application/pdf",
        },
      ];
    } catch (err) {
      console.error(
        `[payments] invoice PDF generation failed for payment ${updated.id} — sending confirmation without attachment`,
        err,
      );
    }
    await sendEmail({
      ...buildPaymentConfirmation({
        fullName,
        amount: Number(updated.amount),
        currency: updated.currency,
        courseTitle: course?.title ?? null,
        invoiceNumber,
      }),
      to: studentEmail,
      ...(attachments ? { attachments } : {}),
    });
    // Notify of course activation only when access was newly granted.
    if (newlyEnrolled && course) {
      await sendEmail({
        ...buildCourseActivation({ fullName, courseTitle: course.title }),
        to: studentEmail,
      });
    }
  }
  return updated;
}

router.get("/payments", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (isStaff(user)) {
    const rows = await db
      .select()
      .from(paymentsTable)
      .orderBy(desc(paymentsTable.createdAt));
    res.json(rows.map(serializePayment));
    return;
  }
  if (user) {
    const rows = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.userId, user.id))
      .orderBy(desc(paymentsTable.createdAt));
    res.json(rows.map(serializePayment));
    return;
  }
  res.json([]);
});

router.post("/payments", requireUser, async (req: AuthedRequest, res) => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { amount, ...rest } = parsed.data;
  const [created] = await db
    .insert(paymentsTable)
    .values({ ...rest, amount: String(amount ?? 0), userId: req.currentUser!.id })
    .returning();
  res.status(201).json(serializePayment(created));
});

// --- PayPal checkout -------------------------------------------------------

router.post(
  "/payments/paypal/create-order",
  requireUser,
  async (req: AuthedRequest, res) => {
    const parsed = CreatePaypalOrderBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    if (!isPaypalConfigured()) {
      res.status(503).json({ error: "PayPal is not configured" });
      return;
    }
    const { courseId, planId, returnUrl, cancelUrl } = parsed.data;
    const userId = req.currentUser!.id;
    const due = await derivePaymentDue(userId, courseId, planId);
    if (!due.ok) {
      res.status(due.status).json({ error: due.error });
      return;
    }
    const { amount, installmentIndex, installmentCount, course } = due;

    const description =
      installmentCount > 1
        ? `Installment ${installmentIndex}/${installmentCount} — ${course.title}`
        : `Tuition — ${course.title}`;

    try {
      const order = await createOrder({
        amount,
        currency: "USD",
        description: description.slice(0, 127),
        returnUrl,
        cancelUrl,
      });
      const [payment] = await db
        .insert(paymentsTable)
        .values({
          userId,
          courseId,
          amount: String(amount),
          currency: "USD",
          status: "pending",
          provider: "paypal",
          reference: order.orderId,
          planId: due.planId,
          installmentIndex,
        })
        .returning();
      res.status(201).json({
        paymentId: payment.id,
        orderId: order.orderId,
        approveUrl: order.approveUrl,
      });
    } catch (err) {
      res
        .status(502)
        .json({ error: err instanceof Error ? err.message : "PayPal error" });
    }
  },
);

router.post(
  "/payments/paypal/capture",
  requireUser,
  async (req: AuthedRequest, res) => {
    const parsed = CapturePaypalOrderBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    if (!isPaypalConfigured()) {
      res.status(503).json({ error: "PayPal is not configured" });
      return;
    }
    const { orderId } = parsed.data;
    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(
        and(
          eq(paymentsTable.reference, orderId),
          eq(paymentsTable.userId, req.currentUser!.id),
        ),
      );
    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }
    if (payment.status === "completed") {
      res.json(serializePayment(payment));
      return;
    }

    // Guard against double-collection from duplicate/concurrent pending orders
    // (e.g. double-click, reload). Check BEFORE capturing so no money is taken
    // if this installment has already been satisfied.
    if (await isDuplicateOfCompleted(payment)) {
      res
        .status(409)
        .json({ error: "This payment has already been completed" });
      return;
    }

    try {
      const result = await captureOrder(orderId);
      if (result.status !== "COMPLETED") {
        res.status(402).json({ error: `Payment ${result.status}` });
        return;
      }
      const updated = await finalizeCompletedPayment(
        payment,
        result.captureId ?? orderId,
      );
      if (updated) {
        res.json(serializePayment(updated));
        return;
      }
      // Another request finalized concurrently — return the completed row.
      const [current] = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.id, payment.id));
      res.json(serializePayment(current ?? payment));
    } catch (err) {
      res
        .status(502)
        .json({ error: err instanceof Error ? err.message : "PayPal error" });
    }
  },
);

// --- Bank of Georgia checkout ----------------------------------------------

router.post(
  "/payments/bog/create-order",
  requireUser,
  async (req: AuthedRequest, res) => {
    const parsed = CreateBogOrderBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    if (!isBogConfigured()) {
      res.status(503).json({ error: "Bank of Georgia is not configured" });
      return;
    }
    const { courseId, planId, returnUrl } = parsed.data;
    const userId = req.currentUser!.id;
    const due = await derivePaymentDue(userId, courseId, planId);
    if (!due.ok) {
      res.status(due.status).json({ error: due.error });
      return;
    }
    const { amount, installmentIndex } = due;

    // One pending BoG payment row per installment slot: reuse an existing
    // pending row (double-click, abandoned checkout) instead of stacking
    // duplicate orders that could each be charged at the bank.
    const pendingRows = await db
      .select()
      .from(paymentsTable)
      .where(
        and(
          eq(paymentsTable.userId, userId),
          eq(paymentsTable.courseId, courseId),
          eq(paymentsTable.provider, "bog"),
          eq(paymentsTable.status, "pending"),
        ),
      );
    const existing = pendingRows.find(
      (p) =>
        (p.planId ?? null) === (due.planId ?? null) &&
        (p.installmentIndex ?? 1) === installmentIndex,
    );

    const payment =
      existing ??
      (
        await db
          .insert(paymentsTable)
          .values({
            userId,
            courseId,
            amount: String(amount),
            currency: "USD",
            status: "pending",
            provider: "bog",
            planId: due.planId,
            installmentIndex,
          })
          .returning()
      )[0];

    const successUrl = new URL(returnUrl);
    successUrl.searchParams.set("bogPaymentId", String(payment.id));
    const failUrl = new URL(returnUrl);
    failUrl.searchParams.set("bogPaymentFailed", "1");
    // Callback must go to OUR api — derive from the request, never from
    // client-supplied URLs.
    const callbackUrl = `${req.protocol}://${req.get("host")}/api/payments/bog/callback`;

    try {
      const order = await createBogOrder({
        amount,
        currency: "USD",
        externalOrderId: String(payment.id),
        productId: `course-${courseId}`,
        callbackUrl,
        successUrl: successUrl.toString(),
        failUrl: failUrl.toString(),
      });
      const [updated] = await db
        .update(paymentsTable)
        .set({ reference: order.orderId, amount: String(amount) })
        .where(eq(paymentsTable.id, payment.id))
        .returning();
      res.status(201).json({
        paymentId: updated.id,
        orderId: order.orderId,
        redirectUrl: order.redirectUrl,
      });
    } catch (err) {
      // The bank order was never created; drop the row only if it was
      // created fresh for this request.
      if (!existing) {
        await db.delete(paymentsTable).where(eq(paymentsTable.id, payment.id));
      }
      res.status(502).json({
        error:
          err instanceof Error ? err.message : "Bank of Georgia error",
      });
    }
  },
);

router.post(
  "/payments/bog/complete",
  requireUser,
  async (req: AuthedRequest, res) => {
    const parsed = CompleteBogPaymentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    if (!isBogConfigured()) {
      res.status(503).json({ error: "Bank of Georgia is not configured" });
      return;
    }
    const { paymentId } = parsed.data;
    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(
        and(
          eq(paymentsTable.id, paymentId),
          eq(paymentsTable.userId, req.currentUser!.id),
        ),
      );
    if (!payment || payment.provider !== "bog" || !payment.reference) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }
    if (payment.status === "completed") {
      res.json(serializePayment(payment));
      return;
    }
    if (await isDuplicateOfCompleted(payment)) {
      res
        .status(409)
        .json({ error: "This payment has already been completed" });
      return;
    }

    try {
      // Never trust the redirect alone — confirm with the bank.
      const details = await getBogPaymentDetails(payment.reference);
      if (details.statusKey !== "completed") {
        res.status(402).json({ error: `Payment ${details.statusKey}` });
        return;
      }
      const updated = await finalizeCompletedPayment(
        payment,
        payment.reference,
      );
      if (updated) {
        res.json(serializePayment(updated));
        return;
      }
      // The bank callback finalized concurrently — return the completed row.
      const [current] = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.id, payment.id));
      res.json(serializePayment(current ?? payment));
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : "Bank of Georgia error",
      });
    }
  },
);

// Server-to-server payment notification from Bank of Georgia. Authenticated
// by the RSA signature over the raw body, not by a user session.
router.post("/payments/bog/callback", async (req, res) => {
  const rawBody = (req as { rawBody?: Buffer }).rawBody;
  const signature = req.get("Callback-Signature");
  if (!rawBody || !verifyBogCallbackSignature(rawBody, signature)) {
    res.status(401).json({ error: "Invalid callback signature" });
    return;
  }
  const body = req.body as {
    event?: string;
    body?: {
      order_id?: string;
      external_order_id?: string;
      order_status?: { key?: string };
    };
  };
  if (body.event !== "order_payment" || !body.body?.order_id) {
    res.status(400).json({ error: "Unsupported callback" });
    return;
  }
  const orderId = body.body.order_id;
  let [payment] = await db
    .select()
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.reference, orderId),
        eq(paymentsTable.provider, "bog"),
      ),
    );
  if (!payment && body.body.external_order_id) {
    // The row's reference may point at a newer re-created order; our
    // external_order_id is the payment row id, so fall back to it.
    const externalId = Number(body.body.external_order_id);
    if (Number.isInteger(externalId)) {
      const [byId] = await db
        .select()
        .from(paymentsTable)
        .where(
          and(
            eq(paymentsTable.id, externalId),
            eq(paymentsTable.provider, "bog"),
          ),
        );
      payment = byId;
    }
  }
  // Always acknowledge with 200 so the bank stops retrying; log anomalies.
  if (!payment) {
    req.log?.warn?.({ orderId }, "BoG callback for unknown order");
    res.status(200).json({ ok: true });
    return;
  }
  if (payment.status === "completed") {
    res.status(200).json({ ok: true });
    return;
  }
  const statusKey = body.body.order_status?.key;
  if (statusKey === "completed") {
    if (await isDuplicateOfCompleted(payment)) {
      req.log?.warn?.(
        { paymentId: payment.id },
        "BoG callback duplicate of an already-satisfied installment",
      );
    } else {
      await finalizeCompletedPayment(payment, orderId);
    }
  } else if (statusKey === "rejected") {
    await db
      .update(paymentsTable)
      .set({ status: "failed" })
      .where(eq(paymentsTable.id, payment.id));
  }
  res.status(200).json({ ok: true });
});

// --- Payment plans ---------------------------------------------------------

router.get("/courses/:courseId/payment-plans", async (req, res) => {
  const courseId = Number(req.params.courseId);
  const rows = await db
    .select()
    .from(paymentPlansTable)
    .where(eq(paymentPlansTable.courseId, courseId))
    .orderBy(asc(paymentPlansTable.orderIndex), asc(paymentPlansTable.id));
  res.json(rows.map(serializePlan));
});

router.post(
  "/courses/:courseId/payment-plans",
  requireStaff,
  async (req, res) => {
    const courseId = Number(req.params.courseId);
    const parsed = CreatePaymentPlanBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [course] = await db
      .select({ id: coursesTable.id })
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId));
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    const { type, name, installmentCount, installmentAmount, orderIndex } =
      parsed.data;
    const count = type === "one-time" ? 1 : installmentCount;
    const total = installmentAmount * count;
    const [created] = await db
      .insert(paymentPlansTable)
      .values({
        courseId,
        type,
        name: name ?? null,
        installmentCount: count,
        installmentAmount: String(installmentAmount),
        totalAmount: String(total),
        orderIndex: orderIndex ?? 0,
      })
      .returning();
    res.status(201).json(serializePlan(created));
  },
);

router.patch("/payment-plans/:id", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdatePaymentPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { type, name, installmentCount, installmentAmount, orderIndex } =
    parsed.data;
  const count = type === "one-time" ? 1 : installmentCount;
  const total = installmentAmount * count;
  const values: Record<string, unknown> = {
    type,
    name: name ?? null,
    installmentCount: count,
    installmentAmount: String(installmentAmount),
    totalAmount: String(total),
  };
  if (orderIndex !== undefined) values.orderIndex = orderIndex;
  const [updated] = await db
    .update(paymentPlansTable)
    .set(values)
    .where(eq(paymentPlansTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Payment plan not found" });
    return;
  }
  res.json(serializePlan(updated));
});

router.delete("/payment-plans/:id", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(paymentPlansTable).where(eq(paymentPlansTable.id, id));
  res.json({ success: true });
});

router.get(
  "/courses/:courseId/plan-status",
  requireUser,
  async (req: AuthedRequest, res) => {
    const courseId = Number(req.params.courseId);
    const status = await getPlanStatus(req.currentUser!.id, courseId);
    res.json(status);
  },
);

// Binary PDF invoice download (not part of the OpenAPI JSON surface).
router.get("/payments/:id/invoice", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = Number(req.params.id);
  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.id, id));
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  if (payment.userId !== user.id && !isStaff(user)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (payment.status !== "completed") {
    res.status(400).json({ error: "Invoice available after payment completes" });
    return;
  }

  const { pdf, invoiceNumber } = await generateInvoicePdfForPayment(payment);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${invoiceNumber}.pdf"`,
  );
  res.send(Buffer.from(pdf));
});

router.get("/certificates", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (isStaff(user)) {
    res.json(
      await db.select().from(certificatesTable).orderBy(desc(certificatesTable.issuedAt)),
    );
    return;
  }
  if (user) {
    res.json(
      await db
        .select()
        .from(certificatesTable)
        .where(eq(certificatesTable.userId, user.id))
        .orderBy(desc(certificatesTable.issuedAt)),
    );
    return;
  }
  res.json([]);
});

const TYPE_PREFIX: Record<string, string> = { degree: "DEG", transcript: "TRN" };

async function publishedResultCourseKeys(): Promise<Set<string>> {
  const rows = await db
    .select({ userId: resultsTable.userId, courseId: subjectsTable.courseId })
    .from(resultsTable)
    .innerJoin(examsTable, eq(examsTable.id, resultsTable.examId))
    .innerJoin(subjectsTable, eq(subjectsTable.id, examsTable.subjectId))
    .where(eq(resultsTable.published, true));
  return new Set(rows.map((r) => `${r.userId}:${r.courseId}`));
}

async function isCertificateEligible(userId: number, courseId: number): Promise<boolean> {
  const [enrollment] = await db
    .select({ id: enrollmentsTable.id })
    .from(enrollmentsTable)
    .where(
      and(
        eq(enrollmentsTable.userId, userId),
        eq(enrollmentsTable.courseId, courseId),
        eq(enrollmentsTable.status, "completed"),
      ),
    )
    .limit(1);
  if (!enrollment) return false;

  const [result] = await db
    .select({ id: resultsTable.id })
    .from(resultsTable)
    .innerJoin(examsTable, eq(examsTable.id, resultsTable.examId))
    .innerJoin(subjectsTable, eq(subjectsTable.id, examsTable.subjectId))
    .where(
      and(
        eq(resultsTable.userId, userId),
        eq(resultsTable.published, true),
        eq(subjectsTable.courseId, courseId),
      ),
    )
    .limit(1);
  return !!result;
}

router.get("/certificates/eligible", requireStaff, async (_req, res) => {
  const completed = await db
    .select({
      userId: enrollmentsTable.userId,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      courseId: enrollmentsTable.courseId,
      courseTitle: coursesTable.title,
    })
    .from(enrollmentsTable)
    .innerJoin(usersTable, eq(usersTable.id, enrollmentsTable.userId))
    .innerJoin(coursesTable, eq(coursesTable.id, enrollmentsTable.courseId))
    .where(eq(enrollmentsTable.status, "completed"));

  const publishedKeys = await publishedResultCourseKeys();

  const issued = await db
    .select()
    .from(certificatesTable)
    .where(eq(certificatesTable.status, "issued"));
  const issuedKeys = new Set(
    issued.map((c) => `${c.userId}:${c.courseId}:${c.type}`),
  );

  res.json(
    completed
      .filter((row) => publishedKeys.has(`${row.userId}:${row.courseId}`))
      .map((row) => ({
      userId: row.userId,
      fullName:
        [row.firstName, row.lastName].filter(Boolean).join(" ") || row.email,
      email: row.email,
      courseId: row.courseId,
      courseTitle: row.courseTitle,
      hasDegree: issuedKeys.has(`${row.userId}:${row.courseId}:degree`),
      hasTranscript: issuedKeys.has(`${row.userId}:${row.courseId}:transcript`),
    })),
  );
});

router.post("/certificates", requireStaff, async (req, res) => {
  const parsed = IssueCertificateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid certificate payload" });
    return;
  }
  const { userId, courseId, type } = parsed.data;

  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  const [course] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, courseId));
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  if (!(await isCertificateEligible(userId, courseId))) {
    res.status(422).json({
      error:
        "Student is not eligible: requires a completed enrollment and published results for this course",
    });
    return;
  }

  const [existing] = await db
    .select()
    .from(certificatesTable)
    .where(
      and(
        eq(certificatesTable.userId, userId),
        eq(certificatesTable.courseId, courseId),
        eq(certificatesTable.type, type),
        eq(certificatesTable.status, "issued"),
      ),
    );
  if (existing) {
    res.status(409).json({ error: "Certificate already issued for this student and course" });
    return;
  }

  const provisional = `pending-${crypto.randomUUID()}`;
  const [created] = await db
    .insert(certificatesTable)
    .values({ userId, courseId, type, certificateNumber: provisional })
    .returning();

  const prefix = TYPE_PREFIX[type] ?? "CGU";
  const number = `CGU-${prefix}-${created.issuedAt.getFullYear()}-${String(created.id).padStart(5, "0")}`;
  const [certificate] = await db
    .update(certificatesTable)
    .set({ certificateNumber: number })
    .where(eq(certificatesTable.id, created.id))
    .returning();

  const fullName =
    [student.firstName, student.lastName].filter(Boolean).join(" ") || student.email;
  await sendEmail({
    ...buildCertificateIssued({
      fullName,
      courseTitle: course.title,
      certificateType: type,
      certificateNumber: number,
    }),
    to: student.email,
  });

  res.status(201).json(certificate);
});

router.post("/certificates/:id/revoke", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  const [certificate] = await db
    .select()
    .from(certificatesTable)
    .where(eq(certificatesTable.id, id));
  if (!certificate) {
    res.status(404).json({ error: "Certificate not found" });
    return;
  }
  const [updated] = await db
    .update(certificatesTable)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(eq(certificatesTable.id, id))
    .returning();
  res.json(updated);
});

export async function buildTranscriptRows(
  userId: number,
  courseId: number,
): Promise<TranscriptRow[]> {
  const subjects = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.courseId, courseId))
    .orderBy(asc(subjectsTable.orderIndex));
  if (subjects.length === 0) return [];
  const subjectIds = subjects.map((s) => s.id);

  const exams = await db
    .select()
    .from(examsTable)
    .where(inArray(examsTable.subjectId, subjectIds));
  if (exams.length === 0) return [];
  const examMap = new Map(exams.map((e) => [e.id, e]));
  const examIds = exams.map((e) => e.id);

  const results = await db
    .select()
    .from(resultsTable)
    .where(
      and(
        eq(resultsTable.userId, userId),
        inArray(resultsTable.examId, examIds),
        eq(resultsTable.published, true),
      ),
    );

  // Keep the best published result per subject, ordered by curriculum order.
  const bestBySubject = new Map<number, (typeof results)[number]>();
  for (const r of results) {
    const exam = examMap.get(r.examId);
    if (!exam) continue;
    const prev = bestBySubject.get(exam.subjectId);
    if (!prev || r.score > prev.score) bestBySubject.set(exam.subjectId, r);
  }

  const rows: TranscriptRow[] = [];
  for (const subject of subjects) {
    const r = bestBySubject.get(subject.id);
    if (!r) continue;
    const exam = examMap.get(r.examId);
    const totalMarks = exam?.totalMarks ?? 100;
    const pct = totalMarks > 0 ? (r.score / totalMarks) * 100 : 0;
    const [codePart, ...titleParts] = subject.title.split(" — ");
    const hasCode = titleParts.length > 0;
    rows.push({
      moduleCode: hasCode ? codePart.trim() : "—",
      moduleTitle: hasCode ? titleParts.join(" — ").trim() : subject.title,
      credits: subject.credits ?? 7.5,
      year: subject.year,
      grade: r.grade && r.grade in GRADE_POINTS ? r.grade : letterGradeFromPercent(pct),
      passed: r.passed,
    });
  }
  return rows;
}

const PROGRAM_CODE: Record<string, string> = {
  undergraduate: "BBA",
  postgraduate: "MBA",
  doctorate: "DBA",
};

router.get("/certificates/:id/download", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = Number(req.params.id);
  const [certificate] = await db
    .select()
    .from(certificatesTable)
    .where(eq(certificatesTable.id, id));
  if (!certificate) {
    res.status(404).json({ error: "Certificate not found" });
    return;
  }
  if (certificate.userId !== user.id && !isStaff(user)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (certificate.status === "revoked") {
    res.status(410).json({ error: "This certificate has been revoked" });
    return;
  }

  const [student] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, certificate.userId));
  const [course] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, certificate.courseId));
  const studentName =
    [student?.firstName, student?.lastName].filter(Boolean).join(" ") ||
    student?.email ||
    "Student";

  let pdf: Uint8Array;
  if (certificate.type === "transcript") {
    const rows = await buildTranscriptRows(certificate.userId, certificate.courseId);
    const [enrollment] = await db
      .select()
      .from(enrollmentsTable)
      .where(
        and(
          eq(enrollmentsTable.userId, certificate.userId),
          eq(enrollmentsTable.courseId, certificate.courseId),
        ),
      );
    const sid = await ensureStudentId(certificate.userId, course?.title);
    pdf = await generateTranscript({
      studentName,
      studentId: sid ?? certificate.certificateNumber,
      degreeAwarded: course?.title ?? "Programme",
      certificateNumber: certificate.certificateNumber,
      enrollmentDate: enrollment?.enrolledAt ?? null,
      completionDate:
        enrollment?.status === "completed"
          ? (enrollment.completedAt ?? certificate.issuedAt)
          : null,
      issuedAt: certificate.issuedAt,
      rows,
    });
  } else {
    pdf = await generateDegreeCertificate({
      studentName,
      studentId: await ensureStudentId(certificate.userId, course?.title),
      courseTitle: course?.title ?? "Programme",
      courseLevel: course?.level ?? "certificate",
      certificateNumber: certificate.certificateNumber,
      issuedAt: certificate.issuedAt,
    });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${certificate.certificateNumber}.pdf"`,
  );
  res.send(Buffer.from(pdf));
});

router.get("/email-logs", requireStaff, async (_req, res) => {
  res.json(
    await db.select().from(emailLogsTable).orderBy(desc(emailLogsTable.createdAt)),
  );
});

router.post("/email-logs/:id/resend", requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  const status = await resendEmailLog(id);
  if (status === null) {
    res.status(404).json({ error: "Email log not found" });
    return;
  }
  const [updated] = await db
    .select()
    .from(emailLogsTable)
    .where(eq(emailLogsTable.id, id));
  res.json(updated);
});

router.get("/courier", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (isStaff(user)) {
    res.json(
      await db
        .select()
        .from(courierTrackingTable)
        .orderBy(desc(courierTrackingTable.requestedAt)),
    );
    return;
  }
  if (user) {
    res.json(
      await db
        .select()
        .from(courierTrackingTable)
        .where(eq(courierTrackingTable.userId, user.id))
        .orderBy(desc(courierTrackingTable.requestedAt)),
    );
    return;
  }
  res.json([]);
});

router.post("/courier", requireUser, async (req: AuthedRequest, res) => {
  const parsed = RequestCourierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid courier request" });
    return;
  }
  const user = req.currentUser!;
  const { certificateId, shippingAddress } = parsed.data;

  if (certificateId != null) {
    const [certificate] = await db
      .select()
      .from(certificatesTable)
      .where(eq(certificatesTable.id, certificateId));
    if (!certificate || certificate.userId !== user.id) {
      res.status(404).json({ error: "Certificate not found" });
      return;
    }
    if (certificate.status === "revoked") {
      res.status(400).json({ error: "Cannot request a copy of a revoked certificate" });
      return;
    }
    const [existing] = await db
      .select()
      .from(courierTrackingTable)
      .where(
        and(
          eq(courierTrackingTable.userId, user.id),
          eq(courierTrackingTable.certificateId, certificateId),
        ),
      );
    if (existing && existing.status !== "delivered" && existing.status !== "returned") {
      res.status(409).json({ error: "A courier request for this certificate is already in progress" });
      return;
    }
  }

  const [created] = await db
    .insert(courierTrackingTable)
    .values({
      userId: user.id,
      certificateId: certificateId ?? null,
      shippingAddress,
      status: "requested",
    })
    .returning();
  res.status(201).json(created);
});

router.patch("/courier/:id", requireStaff, async (req, res) => {
  const parsed = UpdateCourierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid courier update" });
    return;
  }
  const id = Number(req.params.id);
  const [record] = await db
    .select()
    .from(courierTrackingTable)
    .where(eq(courierTrackingTable.id, id));
  if (!record) {
    res.status(404).json({ error: "Courier record not found" });
    return;
  }

  const { carrier, trackingNumber, status } = parsed.data;
  const updates: Partial<typeof courierTrackingTable.$inferInsert> = {};
  if (carrier !== undefined) updates.carrier = carrier;
  if (trackingNumber !== undefined) updates.trackingNumber = trackingNumber;
  if (status !== undefined) updates.status = status;

  const nextStatus = status ?? record.status;
  if (nextStatus === "shipped" && !record.shippedAt) {
    updates.shippedAt = new Date();
  }
  if (nextStatus === "delivered" && !record.deliveredAt) {
    updates.deliveredAt = new Date();
  }

  const [updated] = await db
    .update(courierTrackingTable)
    .set(updates)
    .where(eq(courierTrackingTable.id, id))
    .returning();

  const justShipped = record.status !== "shipped" && nextStatus === "shipped";
  if (justShipped && updated.carrier && updated.trackingNumber) {
    const [student] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, updated.userId));
    if (student) {
      const fullName =
        [student.firstName, student.lastName].filter(Boolean).join(" ") || student.email;
      await sendEmail({
        ...buildCourierDispatched({
          fullName,
          carrier: updated.carrier,
          trackingNumber: updated.trackingNumber,
        }),
        to: student.email,
      });
    }
  }

  res.json(updated);
});

export default router;
