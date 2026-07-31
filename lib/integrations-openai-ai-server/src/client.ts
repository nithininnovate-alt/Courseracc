import OpenAI from "openai";

// Prefer the client's own OpenAI API key when provided; otherwise fall back
// to the Replit-managed OpenAI AI integration proxy.
//
// The client is created lazily so the server can boot without any OpenAI
// configuration (e.g. when self-hosting without AI features). A clear error
// is thrown only when an AI feature is actually used.
let cached: OpenAI | undefined;

function createClient(): OpenAI {
  const ownKey = process.env.OPENAI_API_KEY;
  if (ownKey) {
    return new OpenAI({ apiKey: ownKey });
  }
  if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
    throw new Error(
      "AI features are not configured: set OPENAI_API_KEY, or provision the OpenAI AI integration (AI_INTEGRATIONS_OPENAI_BASE_URL missing).",
    );
  }
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    throw new Error(
      "AI features are not configured: set OPENAI_API_KEY, or provision the OpenAI AI integration (AI_INTEGRATIONS_OPENAI_API_KEY missing).",
    );
  }
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

export const openai: OpenAI = new Proxy({} as OpenAI, {
  get(_target, prop, receiver) {
    cached ??= createClient();
    const value = Reflect.get(cached, prop, cached);
    return typeof value === "function" ? value.bind(cached) : value;
  },
});
