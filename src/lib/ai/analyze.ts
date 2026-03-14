import { getAIClient } from "./client";
import { buildAnalysisPrompt } from "./prompts";
import type { GraphNode, GraphLink, AIAnalysis } from "@/types";

interface RawAIResponse {
  summary: string;
  fileDescriptions: Record<string, string>;
  riskHotspots: AIAnalysis["riskHotspots"];
  onboarding: AIAnalysis["onboarding"];
}

export async function analyzeWithAI(
  repoName: string,
  nodes: GraphNode[],
  links: GraphLink[]
): Promise<{ ai: AIAnalysis; descriptions: Record<string, string> }> {
  const client = getAIClient();
  const prompt = buildAnalysisPrompt(repoName, nodes, links);

  const completion = await client.chat.completions.create({
    model: "Qwen/Qwen2-72B-Instruct",
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: "You are a code analysis assistant. Return ONLY valid JSON, no markdown fences, no explanation.",
      },
      { role: "user", content: prompt },
    ],
  });

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
