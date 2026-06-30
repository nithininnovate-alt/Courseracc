---
name: Copying integrations-openai-ai-server lib
description: Durable gotchas when adding the OpenAI server integration lib to a package
---

**Codegen fails on latent lib type errors, not just spec errors.**
`pnpm --filter @workspace/api-spec run codegen` chains `tsc --build`
(`typecheck:libs`) after orval generation, so a type error in *any* lib fails the
whole codegen run even when generation itself succeeded. After copying a template
lib, typecheck the whole workspace before trusting codegen.

**Why:** the copied `integrations-openai-ai-server` template historically ships
with an unguarded `response.data[0]` in its image client that `strict` mode
rejects.

**How to apply:** when a codegen run reports tsc errors in a freshly added lib,
fix the lib (e.g. optional chaining) rather than assuming the spec or orval config
is wrong.

**SSE chat endpoints can't use generated hooks.** Orval cannot generate React
Query hooks or response zod for streaming endpoints — only the request-body zod
schema generates. The client must read the response via `fetch` +
`ReadableStream` and parse `data:` frames itself.
