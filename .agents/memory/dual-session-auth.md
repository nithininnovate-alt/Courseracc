---
name: Dual-session auth precedence
description: How CGU resolves identity when a staff cookie and a Clerk session coexist in one browser
---

Rule: `resolveCurrentUser` is Clerk-first (student identity wins) so a lingering admin staff cookie never leaks another user's data into student pages. Admin console requests send an `x-portal: admin` header; only then does a valid staff cookie (belonging to an actual staff user) take precedence. `requireStaff` stays staff-cookie-first.

**Why:** Staff-cookie-first resolution once made every student page show the admin's ("vineeth") data for any browser that had an old admin session. Mixed endpoints (e.g. GET /applications) serve both portals, so precedence must be per-request intent, not global.

**How to apply:** Never treat `x-portal` as an auth signal — it is a routing hint; elevation always requires a valid staff JWT cookie + staff role. The header is injected client-side via `setExtraHeadersGetter` in the shared api-client on `/admin` paths. When adding mixed staff/student endpoints, rely on `resolveCurrentUser` and this contract rather than reordering cookie/Clerk checks.
