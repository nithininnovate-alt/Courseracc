---
name: Self-hosting conventions
description: Env-var switches that make the app runnable off-Replit (GCS storage driver, PUBLIC_BASE_URL)
---

- Object storage has two drivers selected by `OBJECT_STORAGE_PROVIDER` (`replit` default | `gcs`). `gcs` needs a service-account key file (`GCS_SERVICE_ACCOUNT_KEY_FILE` or `GOOGLE_APPLICATION_CREDENTIALS`) and signs URLs with the client library's V4 signing; `replit` signs via the sidecar. Bucket paths (`PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`) mean the same in both modes.
- **Why:** self-hosting (Google VM) has no Replit sidecar; keeping one GCS-backed client with two credential modes left all callers unchanged.
- `PUBLIC_BASE_URL` (scheme+host, no trailing slash) takes precedence over Replit domains / request-derived origins for BoG payment callback URLs and email link absolutization. New code needing the public origin should use it first.
- **How to apply:** any new feature that builds absolute public URLs or external callbacks must honor `PUBLIC_BASE_URL`; document new required env vars in `.env.example` and `DEPLOY.md`.
