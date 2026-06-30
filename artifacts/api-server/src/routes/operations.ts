import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import {
  db,
  paymentsTable,
  coursesTable,
  usersTable,
  certificatesTable,
  emailLogsTable,
  courierTrackingTable,
} from "@workspace/db";
import {
  CreatePaymentBody,
  CreatePaypalOrderBody,
  CapturePaypalOrderBody,
} from "@workspace/api-zod";
import {
  resolveCurrentUser,
  isStaff,
  requireUser,
  requireStaff,
  type AuthedRequest,
} from "../lib/auth";
import { isPaypalConfigured, createOrder, captureOrder } from "../lib/paypal";
import { generateInvoice } from "../lib/invoice";
import { ensureEnrollment } from "../lib/access";

const router: IRouter = Router();

type PaymentRow = typeof paymentsTable.$inferSelect;
function serializePayment(p: PaymentRow) {
  return { ...p, amount: Number(p.amount) };
}

function makeInvoiceNumber(id: number, date: Date): string {
  return `INV-${date.getFullYear()}-${String(id).padStart(5, "0")}`;
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
    const { courseId, returnUrl, cancelUrl } = parsed.data;
    const [course] = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId));
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    const amount = Number(course.price);
    if (amount <= 0) {
      res.status(400).json({ error: "This course is free" });
      return;
    }

    try {
      const order = await createOrder({
        amount,
        currency: "USD",
        description: `Tuition — ${course.title}`,
        returnUrl,
        cancelUrl,
      });
      const [payment] = await db
        .insert(paymentsTable)
        .values({
          userId: req.currentUser!.id,
          courseId,
          amount: String(amount),
          currency: "USD",
          status: "pending",
          provider: "paypal",
          reference: order.orderId,
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

    try {
      const result = await captureOrder(orderId);
      if (result.status !== "COMPLETED") {
        res.status(402).json({ error: `Payment ${result.status}` });
        return;
      }
      const invoiceNumber = makeInvoiceNumber(payment.id, new Date());
      const [updated] = await db
        .update(paymentsTable)
        .set({
          status: "completed",
          invoiceNumber,
          reference: result.captureId ?? orderId,
        })
        .where(eq(paymentsTable.id, payment.id))
        .returning();
      if (payment.courseId) {
        await ensureEnrollment(req.currentUser!.id, payment.courseId);
      }
      res.json(serializePayment(updated));
    } catch (err) {
      res
        .status(502)
        .json({ error: err instanceof Error ? err.message : "PayPal error" });
    }
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

  const [student] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, payment.userId));
  let courseTitle = "Course Enrollment";
  if (payment.courseId) {
    const [course] = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.id, payment.courseId));
    if (course) courseTitle = course.title;
  }

  const studentName =
    [student?.firstName, student?.lastName].filter(Boolean).join(" ") ||
    student?.email ||
    "Student";

  const pdf = await generateInvoice({
    invoiceNumber: payment.invoiceNumber ?? makeInvoiceNumber(payment.id, payment.createdAt),
    studentName,
    studentEmail: student?.email ?? "",
    courseTitle,
    amount: Number(payment.amount),
    currency: payment.currency,
    status: payment.status,
    provider: payment.provider,
    reference: payment.reference,
    date: payment.createdAt,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${payment.invoiceNumber ?? `invoice-${payment.id}`}.pdf"`,
  );
  res.send(Buffer.from(pdf));
});

router.get("/certificates", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (isStaff(user)) {
    res.json(await db.select().from(certificatesTable));
    return;
  }
  if (user) {
    res.json(
      await db
        .select()
        .from(certificatesTable)
        .where(eq(certificatesTable.userId, user.id)),
    );
    return;
  }
  res.json([]);
});

router.get("/email-logs", requireStaff, async (_req, res) => {
  res.json(
    await db.select().from(emailLogsTable).orderBy(desc(emailLogsTable.createdAt)),
  );
});

router.get("/courier", async (req, res) => {
  const user = await resolveCurrentUser(req);
  if (isStaff(user)) {
    res.json(await db.select().from(courierTrackingTable));
    return;
  }
  if (user) {
    res.json(
      await db
        .select()
        .from(courierTrackingTable)
        .where(eq(courierTrackingTable.userId, user.id)),
    );
    return;
  }
  res.json([]);
});

export default router;
