---
name: Bank of Georgia payments
description: Conventions and safety rules for the BoG card payment gateway alongside PayPal.
---

# Bank of Georgia gateway

- Rule: one pending BoG payment row per (user, course, plan, installmentIndex) slot — reuse it on repeat create-order calls, since BoG charges at the bank before our duplicate checks can run (unlike PayPal capture).
  **Why:** stacking multiple live bank orders for the same installment lets a user be double-charged externally.
  **How to apply:** any new redirect-style gateway must dedupe at order creation, not at completion.
- Payment finalization is a compare-and-set (`WHERE status='pending'`) so the bank callback racing the browser's complete call runs emails/enrollment exactly once. Callers treat a null return as "already finalized".
- Callback URL is derived from the request (`trust proxy` enabled), never from client-supplied returnUrl. Callback is authenticated only by BoG's published RSA key over the raw body (`req.rawBody` captured via express.json verify).
- BoG `external_order_id` carries our payment row id — callbacks fall back to it when the stored order reference is stale.
- BoG supports USD; orders use USD to match course pricing.
- Routes return 503 until BOG_CLIENT_ID/BOG_CLIENT_SECRET secrets are set.

## Stale-order callbacks after re-pricing
Pending BoG rows are reused across checkout retries and re-priced (e.g. discount codes). A callback whose order_id doesn't match the row's current reference is a *stale order* — finalize only if the bank-reported transfer_amount matches the stored amount; otherwise log and leave for manual review. Discounts are always resolved server-side from the code at order creation; never trust client amounts.
