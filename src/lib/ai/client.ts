import OpenAI from "openai";

let client: OpenAI | null = null;

export function getAIClient(): OpenAI {
  if (client) return client;

  const apiKey = process.env.FEATHERLESS_API_KEY;
  if (!apiKey) {
    throw new Error("FEATHERLESS_API_KEY environment variable is not set");
  }

  client = new OpenAI({
    apiKey,
    baseURL: "https://api.featherless.ai/v1",
  });
  return client;
}
