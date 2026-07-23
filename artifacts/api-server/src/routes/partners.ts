import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, partnerCentersTable, discountCodesTable } from "@workspace/db";
import {
  CreatePartnerCenterBody,
  UpdatePartnerCenterBody,
  CreateDiscountCodeBody,
  UpdateDiscountCodeBody,
} from "@workspace/api-zod";
import { requireStaff, type AuthedRequest } from "../lib/auth";
import { normalizeDiscountCode } from "../lib/discounts";

const router: IRouter = Router();

type CenterRow = typeof partnerCentersTable.$inferSelect;
function serializeCenter(c: CenterRow) {
  return { ...c, discountValue: Number(c.discountValue) };
}

router.get("/partner-centers", requireStaff, async (_req, res) => {
  const rows = await db
    .select()
    .from(partnerCentersTable)
    .orderBy(desc(partnerCentersTable.createdAt));
  res.json(rows.map(serializeCenter));
});

router.post("/partner-centers", requireStaff, async (req: AuthedRequest, res) => {
  const parsed = CreatePartnerCenterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { name, discountType, discountValue } = parsed.data;
  if (discountType === "percent" && discountValue > 100) {
    res.status(400).json({ error: "Percentage discount cannot exceed 100" });
    return;
  }
  const [created] = await db
    .insert(partnerCentersTable)
    .values({ name, discountType, discountValue: String(discountValue) })
    .returning();
  res.status(201).json(serializeCenter(created));
});

router.patch("/partner-centers/:id", requireStaff, async (req: AuthedRequest, res) => {
  const parsed = UpdatePartnerCenterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { name, discountType, discountValue, active } = parsed.data;
  const [existing] = await db
    .select()
    .from(partnerCentersTable)
    .where(eq(partnerCentersTable.id, Number(req.params.id)));
  if (!existing) {
    res.status(404).json({ error: "Partner center not found" });
    return;
  }
  // Validate the percentage cap against the effective (post-update) type.
  const effectiveType = discountType ?? existing.discountType;
  const effectiveValue = discountValue ?? Number(existing.discountValue);
  if (effectiveType === "percent" && effectiveValue > 100) {
    res.status(400).json({ error: "Percentage discount cannot exceed 100" });
    return;
  }
  const [updated] = await db
    .update(partnerCentersTable)
    .set({
      ...(name != null ? { name } : {}),
      ...(discountType != null ? { discountType } : {}),
      ...(discountValue != null ? { discountValue: String(discountValue) } : {}),
      ...(active != null ? { active } : {}),
    })
    .where(eq(partnerCentersTable.id, Number(req.params.id)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Partner center not found" });
    return;
  }
  res.json(serializeCenter(updated));
});

router.get("/discount-codes", requireStaff, async (_req, res) => {
  const rows = await db
    .select({
      id: discountCodesTable.id,
      centerId: discountCodesTable.centerId,
      centerName: partnerCentersTable.name,
      code: discountCodesTable.code,
      active: discountCodesTable.active,
      usageCount: discountCodesTable.usageCount,
      createdAt: discountCodesTable.createdAt,
    })
    .from(discountCodesTable)
    .leftJoin(
      partnerCentersTable,
      eq(discountCodesTable.centerId, partnerCentersTable.id),
    )
    .orderBy(desc(discountCodesTable.createdAt));
  res.json(rows);
});

router.post("/discount-codes", requireStaff, async (req: AuthedRequest, res) => {
  const parsed = CreateDiscountCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { centerId } = parsed.data;
  const [center] = await db
    .select()
    .from(partnerCentersTable)
    .where(eq(partnerCentersTable.id, centerId));
  if (!center) {
    res.status(400).json({ error: "Partner center not found" });
    return;
  }
  // Use the provided code or generate one from the center name.
  const code = parsed.data.code
    ? normalizeDiscountCode(parsed.data.code)
    : `${center.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase() || "CGU"}-${crypto
        .randomUUID()
        .slice(0, 6)
        .toUpperCase()}`;
  if (!/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(code)) {
    res.status(400).json({
      error: "Codes must be 4-32 letters, digits, or dashes",
    });
    return;
  }
  try {
    const [created] = await db
      .insert(discountCodesTable)
      .values({ centerId, code })
      .returning();
    res.status(201).json({ ...created, centerName: center.name });
  } catch {
    res.status(409).json({ error: "This code already exists" });
  }
});

router.patch("/discount-codes/:id", requireStaff, async (req: AuthedRequest, res) => {
  const parsed = UpdateDiscountCodeBody.safeParse(req.body);
  if (!parsed.success || parsed.data.active == null) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [updated] = await db
    .update(discountCodesTable)
    .set({ active: parsed.data.active })
    .where(eq(discountCodesTable.id, Number(req.params.id)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Discount code not found" });
    return;
  }
  res.json(updated);
});

export default router;
