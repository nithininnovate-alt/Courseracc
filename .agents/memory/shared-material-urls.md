---
name: Shared material object URLs
description: Access checks for storage objects must consider ALL materials sharing a URL, not one arbitrary row.
---

Many study materials (across different courses) can point at the same object-storage path (e.g. the seeded sample lecture video/PDF used by 16 materials).

**Rule:** any authorization that resolves an object path back to a study material must gather ALL matching (course, year) pairs and allow if ANY is accessible — never `.limit(1)`.

**Why:** a `.limit(1)` lookup returned an arbitrary course, causing students with valid access to get 403 on videos/PDFs in production ("video still same issue"). Fixed in `userCanAccessMaterialObject`; regression test `access.sharedUrl.test.ts`.

**Also:** Playwright test-agent Chromium lacks the H.264 codec — "no supported source was found" on MP4 playback in e2e tests is a false failure; verify via HTTP status + byte-hash comparison instead.
