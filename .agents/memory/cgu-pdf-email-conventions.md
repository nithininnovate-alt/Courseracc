---
name: CGU PDF theme & email transports
description: Conventions for CGU branded PDFs and the outgoing email provider chain in the api-server.
---

## PDF branding
All api-server PDF generators (invoice, result slip, degree certificate, transcript, admission letter, enrollment record) must use the shared theme module in the api-server pdf lib (`pdfTheme`) — purple/gold registrar letterhead with CGU logo badge, "Georgia", and verification/email footer lines.
**Why:** User supplied an official transcript design (July 2026) and asked that every issued document match it.
**How to apply:** New document types should call drawLetterhead/drawThemeFooter rather than defining their own colors; verification URL is verification.cgu.edu.ge, registrar email registrar@cgu.edu.ge.
Note: the academic transcript is served from the same route as certificates (`/certificates/:id/download` when type === "transcript"); there is no separate `/transcript` route.

## Email transports
`deliverEmail` uses a provider chain: SendGrid → Gmail SMTP (nodemailer, GMAIL_USER + GMAIL_APP_PASSWORD app password) → Resend, pinnable via EMAIL_PROVIDER. SendGrid key comes from the Replit SendGrid connector or SENDGRID_API_KEY secret, and requires a verified sender (EMAIL_FROM or SENDGRID_FROM) or it is skipped with a warning. No provider configured → message logged to console, treated as success.
**Why:** SendGrid rejects unverified senders; silently defaulting to a Resend address caused rejected sends (caught in review July 2026).
**How to apply:** When touching email config, keep the per-provider `fromFor()` logic; never default a SendGrid send to a non-verified address.
