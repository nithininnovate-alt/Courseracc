---
name: archiver v8 ESM quirk
description: archiver v8 has no default export in the api-server ESM build; use named ZipArchive.
---

# archiver v8 is ESM-only — no default export

In `artifacts/api-server`, archiver v8 must be imported as a named export, not a default:

```ts
import { ZipArchive, type ArchiverError } from "archiver";
const archive = new ZipArchive({ zlib: { level: 9 } });
```

`import archiver from "archiver"` (default) is `undefined` at runtime and breaks the
`GET /assignments/:id/submissions/download` zip route.

**Why:** archiver v8 dropped the CommonJS default export; the api-server build is ESM.
**How to apply:** any time you stream a zip in api-server, use `ZipArchive` named import.
