---
name: Portal homepage section-scroll nav
description: Why in-page nav uses JS scrollIntoView instead of hash anchors, and header-offset handling
---

In `artifacts/portal` (React + Vite with a base path, wouter router with `base={basePath}`),
plain `<a href="#section">` hash anchors do NOT reliably scroll to in-page sections.

**Rule:** For in-page section navigation on the portal homepage, use an onClick handler that
calls `e.preventDefault()` + `document.getElementById(id)?.scrollIntoView({behavior:'smooth'})`.
Do not rely on raw hash-anchor navigation.

**Why:** Under the Vite base path + wouter setup, hash-anchor default navigation gets
intercepted / rewritten and the browser does not perform the in-page scroll. The pre-existing
"Watch Video" button already worked around this with scrollIntoView.

**How to apply:** Header nav, mobile menu, and hero CTAs that target a section all go through
a shared scrollToSection helper. Sections that are scroll targets carry `scroll-mt-24` so the
fixed header does not obscure their top. Route navigation (e.g. Apply Now → /apply) still uses
wouter `setLocation` normally — only in-page section jumps need the JS scroll workaround.
