import { getAIClient } from "./client";
import { buildAnalysisPrompt } from "./prompts";
import type { GraphNode, GraphLink, AIAnalysis } from "@/types";

interface RawAIResponse {
  summary: string;
  fileDescriptions: Record<string, string>;
  riskHotspots: AIAnalysis["riskHotspots"];
  onboarding: AIAnalysis["onboarding"];
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`AI request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export async function analyzeWithAI(
  repoName: string,
  nodes: GraphNode[],
  links: GraphLink[]
): Promise<{ ai: AIAnalysis; descriptions: Record<string, string> }> {
  const client = getAIClient();
  const prompt = buildAnalysisPrompt(repoName, nodes, links);

  const MAX_RETRIES = 3;
  const REQUEST_TIMEOUT_MS = 45000;
  let completion;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      completion = await withTimeout(
        client.chat.completions.create({
          model: "Qwen/Qwen2-72B-Instruct",
          max_tokens: 4096,
          messages: [
            {
              role: "system",
              content: "You are a code analysis assistant. Return ONLY valid JSON, no markdown fences, no explanation.",
            },
            { role: "user", content: prompt },
          ],
        }),
        REQUEST_TIMEOUT_MS
      );
      break;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const message = err instanceof Error ? err.message : "";
      const retryable = code === "concurrency_limit_exceeded" || message.includes("timed out");

      if (retryable && attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }

  if (!completion) {
    throw new Error("AI request failed after retries");
  }

  const text = completion.choices[0]?.message?.content;
  if (!text) {
    throw new Error("No text response from AI");
  }

  // Strip markdown fences if the model wraps the JSON
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  let parsed: RawAIResponse;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response as JSON");
  }

  const ai: AIAnalysis = {
    summary: parsed.summary,
    riskHotspots: parsed.riskHotspots ?? [],
    onboarding: parsed.onboarding ?? { steps: [] },
  };

  return { ai, descriptions: parsed.fileDescriptions ?? {} };
}
