---
name: pnpm workspace dep linking for esbuild bundling
description: Why a dependency listed in a package's package.json can still fail esbuild resolution, and the fix.
---

# esbuild "Could not resolve <pkg>" in a workspace package

Symptom: an artifact's dev/build (esbuild bundling, e.g. `artifacts/api-server` build.mjs) fails with `Could not resolve "<pkg>"` even though `<pkg>` is in that package's `package.json` dependencies and present in the pnpm store (`node_modules/.pnpm/<pkg>@x`).

**Cause:** the package is in the store but not symlinked into the consuming workspace package's own `node_modules/` (no `artifacts/<app>/node_modules/<pkg>` symlink). esbuild resolves from the package dir, so it can't find it.

**Fix:** run `pnpm install` at the repo root to relink workspace packages, then restart the workflow. Verify with `ls -la artifacts/<app>/node_modules/<pkg>` (should be a symlink into `.pnpm`).

**How to apply:** any time you (or a prior session) edit a workspace package's `package.json` deps, run `pnpm install` before relying on esbuild/tsc; a stale lockfile-only state leaves the symlink missing.
