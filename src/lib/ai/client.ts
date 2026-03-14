import OpenAI from "openai";

let client: OpenAI | null = null;

export function getAIClient(): OpenAI {
  if (client) return client;

  const apiKey = process.env.GITHUB_TOKEN;
  if (!apiKey) {
    throw new Error("GITHUB_TOKEN environment variable is not set");
  }

  client = new OpenAI({
    apiKey,
    baseURL: "https://models.inference.ai.azure.com",
  });
  return client;
}
