import OpenAI from "openai";

// Prefer the client's own OpenAI API key when provided; otherwise fall back
// to the Replit-managed OpenAI AI integration proxy.
const ownKey = process.env.OPENAI_API_KEY;

if (!ownKey) {
  if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
    throw new Error(
      "Set OPENAI_API_KEY, or provision the OpenAI AI integration (AI_INTEGRATIONS_OPENAI_BASE_URL missing).",
    );
  }
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    throw new Error(
      "Set OPENAI_API_KEY, or provision the OpenAI AI integration (AI_INTEGRATIONS_OPENAI_API_KEY missing).",
    );
  }
}

export const openai = ownKey
  ? new OpenAI({ apiKey: ownKey })
  : new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
