import type { GraphNode, GraphLink } from "@/types";

export function buildAnalysisPrompt(
  repoName: string,
  nodes: GraphNode[],
  links: GraphLink[]
): string {
  const nodesSummary = nodes
    .map(
      (n) =>
        `- ${n.id} (${n.type}, ${n.lines} lines, ${n.imports} imports, ${n.importedBy} imported-by, complexity: ${n.complexity})`
    )
    .join("\n");

  const linksSummary = links
    .slice(0, 200) // Cap to avoid token limits
    .map((l) => `  ${l.source} → ${l.target}`)
    .join("\n");

  return `You are analyzing the structure of a GitHub repository called "${repoName}".

Here are the files (nodes) in the dependency graph:
${nodesSummary}

Here are the import relationships (links):
${linksSummary}

Provide your analysis as a JSON object with this exact structure:
{
  "summary": "A 2-3 sentence overview of the repository's architecture and purpose.",
  "fileDescriptions": {
    "<file_path>": "One-sentence description of what this file does."
  },
  "riskHotspots": [
    {
      "file": "<file_path>",
      "reason": "Why this file is a risk area.",
      "severity": "low" | "medium" | "high"
    }
  ],
  "onboarding": {
    "steps": [
      {
        "title": "Step title",
        "file": "<file_path or array of file paths>",
        "explanation": "What to look at and why."
      }
    ]
  }
}

Rules:
- fileDescriptions must include every file from the node list above.
- riskHotspots should focus on files with high complexity, many dependents (importedBy), or structural issues. Include 3-8 hotspots.
- onboarding steps should guide a new developer through the codebase in logical order. Include 4-8 steps.
- Return ONLY valid JSON, no markdown fences, no explanation outside the JSON.`;
}
