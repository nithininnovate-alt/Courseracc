import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  paymentsTable,
  certificatesTable,
  emailLogsTable,
  courierTrackingTable,
} from "@workspace/db";
import { CreatePaymentBody } from "@workspace/api-zod";
import {
  resolveCurrentUser,
  isStaff,
  requireUser,
  requireStaff,
  type AuthedRequest,
} from "../lib/auth";

const router: IRouter = Router();

type PaymentRow = typeof paymentsTable.$inferSelect;
function serializePayment(p: PaymentRow) {
  return { ...p, amount: Number(p.amount) };
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
