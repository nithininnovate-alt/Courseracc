---
name: Payment plans data model
description: How a student's chosen payment plan and installment progress are derived (portal SMS+LMS)
---

# Payment plans / installments

A student's chosen plan and installment progress are NOT stored on a separate
enrollment/plan-selection row. They are **derived from the `payments` table**:
each payment carries `planId` and `installmentIndex`, and progress = count of
`completed` payments for that plan.

**Why:** avoids a second source of truth that could drift from actual payments;
a completed PayPal capture is the authoritative record that an installment was paid.

**How to apply:**
- Legacy payments have `planId = null` — treat a completed null-plan payment as a
  fully-paid one-time purchase (never block or ask for more).
- Course access rule is unchanged: free course OR >=1 completed payment. Paying
  the first installment unlocks the whole course; later installments are billing,
  not gating.
- `create-order` derives the next installment amount server-side from prior
  completed payments; the client only sends `planId` on the first payment.
- Plan `totalAmount` is always computed server-side as
  `installmentAmount * installmentCount` (one-time forces count = 1). Don't trust a
  client-supplied total.
- If a plan row is later deleted/reconfigured, `getPlanStatus` falls back to
  reporting what the payments show (treated as complete) rather than erroring.
