import { eq } from "drizzle-orm";
import { db, discountCodesTable, partnerCentersTable } from "@workspace/db";

export type DiscountCodeRow = typeof discountCodesTable.$inferSelect;
export type PartnerCenterRow = typeof partnerCentersTable.$inferSelect;

export type DiscountResolution =
  | {
      ok: true;
      codeRow: DiscountCodeRow;
      center: PartnerCenterRow;
      /** Discount amount, rounded to cents, capped so total stays >= 0.01. */
      discountAmount: number;
      /** Amount to charge after the discount. */
      total: number;
    }
  | { ok: false; error: string };

export function normalizeDiscountCode(code: string): string {
  return code.trim().toUpperCase();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Server-side validation and price computation for a partner discount code.
 * Never trusts client-provided amounts — callers pass the server-derived
 * amount due. The charged total is floored at 0.01 because both payment
 * providers reject zero-amount orders.
 */
export async function resolveDiscount(
  rawCode: string,
  amountDue: number,
): Promise<DiscountResolution> {
  const code = normalizeDiscountCode(rawCode);
  if (!/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(code)) {
    return { ok: false, error: "Invalid code format" };
  }
  const [codeRow] = await db
    .select()
    .from(discountCodesTable)
    .where(eq(discountCodesTable.code, code));
  if (!codeRow) {
    return { ok: false, error: "Unknown discount code" };
  }
  if (!codeRow.active) {
    return { ok: false, error: "This code is no longer active" };
  }
  const [center] = await db
    .select()
    .from(partnerCentersTable)
    .where(eq(partnerCentersTable.id, codeRow.centerId));
  if (!center || !center.active) {
    return { ok: false, error: "This code is no longer active" };
  }
  const value = Number(center.discountValue);
  if (!(value > 0)) {
    return { ok: false, error: "This code has no discount configured" };
  }
  let discountAmount =
    center.discountType === "percent"
      ? round2((amountDue * Math.min(value, 100)) / 100)
      : round2(value);
  // Providers reject zero-amount orders — keep at least 0.01 chargeable.
  discountAmount = Math.min(discountAmount, round2(amountDue - 0.01));
  if (discountAmount <= 0) {
    return { ok: false, error: "This code cannot be applied to this payment" };
  }
  return {
    ok: true,
    codeRow,
    center,
    discountAmount,
    total: round2(amountDue - discountAmount),
  };
}
