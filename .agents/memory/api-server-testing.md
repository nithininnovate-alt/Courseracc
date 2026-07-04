---
name: api-server testing
description: How to write hermetic route tests for the api-server (vitest), and the import-time env traps that force mocking.
---

# api-server tests (vitest)

Runner: `vitest` is a devDependency of `@workspace/api-server`; run with `pnpm --filter @workspace/api-server test` (`vitest run`). Tests live beside routes as `*.test.ts` under `src/`.

## Hermetic route testing pattern
Mount only the router under test in a bare `express()` app and hit it with a real ephemeral listener + global `fetch` (SSE routes end their response in a `finally`, so `fetch`/`res.text()` resolves). Mock the boundaries with `vi.mock` + `vi.hoisted` shared state:
- `@workspace/db` — a chainable, thenable `select()` that shifts a per-test queue; stub `insert().values().onConflictDoUpdate()`.
- `../lib/auth` `requireUser` — gate on a flag to simulate 401 vs authed.
- `../lib/access` — stub `getCourseIdForMaterial` / `isUserEnrolled` / `getCourseAccess`.
- `drizzle-orm` `eq`/`and`/`inArray` — no-ops (the mocked db ignores predicates).

**Why mock, not a real DB:** `@workspace/integrations-openai-ai-server` (client.ts) THROWS at import time if `AI_INTEGRATIONS_OPENAI_*` env vars are unset, and `@workspace/db` throws without `DATABASE_URL`. So any test that imports a route touching them must mock them regardless. Import the router with a dynamic `await import("./route")` AFTER the `vi.mock` calls.
