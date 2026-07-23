---
name: Newsletter HTML email rules
description: Constraints for rich-HTML emails (sanitization, image hosting, URL absolutization)
---

- Admin-composed HTML must be sanitized server-side (allowlist, sanitize-html) before store AND send; previews render the stored, already-sanitized HTML.
- Images embedded in emails must live in PUBLIC object storage (served without auth) — email clients can't authenticate. Private /objects paths will render broken.
- Only http(s) or `/api/storage/public-objects/...` are valid img src values; everything else is dropped by the sanitizer.
- Email clients can't resolve relative URLs: absolutize src/href at send time using the Replit public domain; store relative paths in DB so dev/prod both work. Refuse to send if no public domain is configured and relative URLs remain.
- Keep a plain-text part derived from the HTML (include image alt text and link URLs) for text-only clients.

**Why:** XSS via dangerouslySetInnerHTML previews and broken images in inboxes were the two failure modes flagged in review.
**How to apply:** any future feature that emails user-composed HTML (e.g. course announcements) should reuse `newsletterHtml.ts` helpers rather than re-inventing.
