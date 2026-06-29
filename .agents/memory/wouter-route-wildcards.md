---
name: wouter v3 route wildcard patterns
description: How to write parent routes that match both the bare path and all sub-paths in wouter v3 (portal artifact).
---

# wouter v3 wildcard matching for nested Switch routes

In the portal artifact, top-level routes wrap a section in a parent `<Route>` containing a nested `<Switch>` of absolute child routes (e.g. `/portal`, `/portal/applications`). The parent route's pattern must match BOTH the bare section path and every sub-path, or sub-paths fall through to the top-level NotFound.

**Rule:** use `path="/portal/*?"` (and `/admin/*?`) for the parent route.

**Why:** wouter v3 compiles paths with `regexparam`. Empirically:
- `/portal*`  → matches `/portal` only, NOT `/portal/applications` (the `*` after a non-slash char does not span the slash).
- `/portal/*` → matches `/portal/applications`, NOT bare `/portal`.
- `/portal/*?` → matches BOTH `/portal` and `/portal/applications`. This is the one to use.

A bug from `path="/portal*"` shows as: bare `/portal` renders, but every `/portal/<sub>` URL renders the app's own 404 page.

**How to apply:** any time you add a parent/section route in `artifacts/portal/src/App.tsx` that delegates to a nested Switch of absolute child paths, use the `/<section>/*?` form. Child routes inside stay absolute (e.g. `/portal/applications`).

## Auth gate redirect (related)
`RequireSignedIn` must redirect unauthenticated users with `<Redirect to="/sign-in" />`, NOT render `<SignInPage/>` inline. Clerk's `<SignIn routing="path" path="/sign-in">` renders nothing when the current URL is not `/sign-in`, so inlining it at `/apply` or `/portal/*` produces a blank page.
