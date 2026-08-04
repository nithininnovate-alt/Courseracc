---
name: Self-hosting conventions
description: Env-var switches that make the app runnable off-Replit (GCS storage driver, PUBLIC_BASE_URL)
---

- Object storage has two drivers selected by `OBJECT_STORAGE_PROVIDER` (`replit` default | `gcs`). `gcs` needs a service-account key file (`GCS_SERVICE_ACCOUNT_KEY_FILE` or `GOOGLE_APPLICATION_CREDENTIALS`) and signs URLs with the client library's V4 signing; `replit` signs via the sidecar. Bucket paths (`PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`) mean the same in both modes.
- **Why:** self-hosting (Google VM) has no Replit sidecar; keeping one GCS-backed client with two credential modes left all callers unchanged.
- `PUBLIC_BASE_URL` (scheme+host, no trailing slash) takes precedence over Replit domains / request-derived origins for BoG payment callback URLs and email link absolutization. New code needing the public origin should use it first.
- **How to apply:** any new feature that builds absolute public URLs or external callbacks must honor `PUBLIC_BASE_URL`; document new required env vars in `.env.example` and `DEPLOY.md`.
- Clerk on custom domains: `publishableKeyFromHost` derives the key as `clerk.<current hostname>` and **ignores a pk_live fallback** — on a self-hosted domain this points at a nonexistent Frontend API and blanks the whole site (clerk-js script fails to load). Both portal and api-server now use the configured env key literally when the host is not `.replit.app/.replit.dev/.repl.co`, and only derive from hostname on Replit-managed hosts.
- **Why:** Replit-managed Clerk provisions keys per-domain (derivation is correct there); external Clerk production instances have one fixed key whose domain need not match the site host.
- Clerk production checklist for a new custom domain: the dashboard's Domains page CNAMEs must all verify AND SSL show "issued" before the site can load (`curl https://clerk.<domain>/v1/environment` → 200 = ready); changing the Clerk primary domain regenerates the pk_live/sk_live keys.
