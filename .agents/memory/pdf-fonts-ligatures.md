---
name: PDF custom fonts & ligature gaps
description: Conventions for embedding custom TTFs in CGU PDFs and avoiding pdf-lib ligature gaps
---
- All CGU PDFs use asset TTFs in artifacts/api-server/src/assets (IBM Plex Sans body, Poppins SemiBold headings).
- Degree cert (July 2026 template): Manufacturing Consent for ALL blackletter headings (univ name, IEAC line, "Be it known that", student name, degree title, signature name) + Libre Baskerville Italic for body/date/Director/SID-verification; no "at Georgia" line; student name auto-fits by shrinking size.
- **Rule:** embed custom fonts only through `embedAssetFont()` in pdfTheme.ts, which passes `{ features: { liga: false, rlig: false } }`.
- **Why:** pdf-lib+fontkit applies 'fi'/'fl' ligatures during layout, and subset TTFs render them as visible gaps ("Verifi cation").
- **How to apply:** any new PDF generator or new font must use embedAssetFont and call `doc.registerFontkit(fontkit)` after PDFDocument.create().
- Border conventions: themed registrar docs get thin purple border via drawPaper default; degree certificate passes `{ withBorder: false }` and draws bronze drawCertFrame.
- Good source for TTFs: gwfh.mranftl.com API (google/fonts raw URLs often return HTML).
