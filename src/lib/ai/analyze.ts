import { getAIClient } from "./client";
import { buildAnalysisPrompt, buildSecurityFocusedPrompt } from "./prompts";
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

function parseAIResponse(
  text: string,
  nodeIds?: string[]
): { ai: AIAnalysis; descriptions: Record<string, string> } {
  // Strip markdown fences
  let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  console.log("AI response length:", text.length, "chars");

  // If still not valid JSON, try to extract the first { ... } block
  let parsed: RawAIResponse;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        parsed = JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        console.error("AI raw response (failed to parse):", text.substring(0, 1000));
        throw new Error("Failed to parse AI response as JSON");
      }
    } else {
      console.error("AI raw response (no JSON found):", text.substring(0, 1000));
      throw new Error("Failed to parse AI response as JSON");
    }
  }

  const ai: AIAnalysis = {
    summary: parsed.summary ?? "",
    riskHotspots: parsed.riskHotspots ?? [],
    onboarding: parsed.onboarding ?? { steps: [] },
  };

  const descriptions = parsed.fileDescriptions ?? {};

  // Fill gaps: if the AI missed some files, add a readable fallback
  if (nodeIds) {
    for (const id of nodeIds) {
      if (!descriptions[id]) {
        console.warn(`AI missed description for: ${id}`);
      }
    }
  }

  return { ai, descriptions };
}

export async function analyzeWithAI(
  repoName: string,
  nodes: GraphNode[],
  links: GraphLink[],
  fileSnippets?: Record<string, string>
): Promise<{ ai: AIAnalysis; descriptions: Record<string, string> }> {
  const client = getAIClient();
  const prompt = buildAnalysisPrompt(repoName, nodes, links, fileSnippets);

  const MAX_RETRIES = 3;
  const REQUEST_TIMEOUT_MS = 60000;
  let completion;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      completion = await withTimeout(
        client.chat.completions.create({
          model: "Qwen/Qwen2-72B-Instruct",
          max_tokens: 8192,
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

  return parseAIResponse(text, nodes.map((n) => n.id));
}

export async function analyzeWithDeepSeek(
  repoName: string,
  nodes: GraphNode[],
  links: GraphLink[],
  fileSnippets?: Record<string, string>
): Promise<{ ai: AIAnalysis; descriptions: Record<string, string> }> {
  const client = getAIClient();
  const prompt = buildSecurityFocusedPrompt(repoName, nodes, links, fileSnippets);

  const MAX_RETRIES = 5;
  let completion;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      completion = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 8192,
        messages: [
          {
            role: "system",
            content: "You are a security-focused code analysis assistant. Return ONLY valid JSON, no markdown fences, no explanation.",
          },
          { role: "user", content: prompt },
        ],
      });
      break;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "concurrency_limit_exceeded" && attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }

  if (!completion) {
    throw new Error("Security AI request failed after retries");
  }

  const text = completion.choices[0]?.message?.content;
  if (!text) {
    throw new Error("No text response from security AI");
  }

  return parseAIResponse(text, nodes.map((n) => n.id));
}
