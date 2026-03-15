import type { GraphNode, GraphLink } from "@/types";

export function buildAnalysisPrompt(
  repoName: string,
  nodes: GraphNode[],
  links: GraphLink[],
  fileSnippets?: Record<string, string>
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

  let fileContentsSection = "";
  if (fileSnippets && Object.keys(fileSnippets).length > 0) {
    const snippetEntries = Object.entries(fileSnippets)
      .map(([path, code]) => `=== ${path} ===\n${code}`)
      .join("\n\n");
    fileContentsSection = `\n\nHere are the first lines of each file's source code (use this to write accurate descriptions):\n${snippetEntries}`;
  }

  return `You are analyzing the structure of a GitHub repository called "${repoName}".

Here are the files (nodes) in the dependency graph:
${nodesSummary}

Here are the import relationships (links):
${linksSummary}${fileContentsSection}

Provide your analysis as a JSON object with this exact structure:
{
  "summary": "A 2-3 sentence overview of the repository's architecture and purpose.",
  "fileDescriptions": {
    "<file_path>": "2-3 sentence human-readable description of what this file does. Write so that anyone can understand it, even without programming experience. Avoid jargon."
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
- fileDescriptions must include every file from the node list above. Each description must be 2-3 plain English sentences that explain what the file does and why it matters, written for a non-technical reader.
- riskHotspots should focus on files with high complexity, many dependents (importedBy), or structural issues. Include 3-8 hotspots.
- onboarding steps should guide a new developer through the codebase in logical order. Include 4-8 steps.
- Return ONLY valid JSON, no markdown fences, no explanation outside the JSON.`;
}

export function buildSecurityFocusedPrompt(
  repoName: string,
  nodes: GraphNode[],
  links: GraphLink[],
  fileSnippets?: Record<string, string>
): string {
  const nodesSummary = nodes
    .map(
      (n) =>
        `- ${n.id} (${n.type}, ${n.lines} lines, ${n.imports} imports, ${n.importedBy} imported-by, complexity: ${n.complexity})`
    )
    .join("\n");

  const linksSummary = links
    .slice(0, 200)
    .map((l) => `  ${l.source} \u2192 ${l.target}`)
    .join("\n");

  let fileContentsSection = "";
  if (fileSnippets && Object.keys(fileSnippets).length > 0) {
    const snippetEntries = Object.entries(fileSnippets)
      .map(([path, code]) => `=== ${path} ===\n${code}`)
      .join("\n\n");
    fileContentsSection = `\n\nHere are the first lines of each file's source code (use this to write accurate descriptions):\n${snippetEntries}`;
  }

  return `You are a senior security engineer analyzing the repository "${repoName}".
Focus on security vulnerabilities, attack surface, data flow risks, and dependency dangers.

Here are the files (nodes) in the dependency graph:
${nodesSummary}

Here are the import relationships (links):
${linksSummary}${fileContentsSection}

Provide your analysis as a JSON object with this exact structure:
{
  "summary": "A 2-3 sentence security-focused overview of the repository. Highlight the main attack surface and trust boundaries.",
  "fileDescriptions": {
    "<file_path>": "2-3 sentence security-relevant description of this file, written in plain English so anyone can understand."
  },
  "riskHotspots": [
    {
      "file": "<file_path>",
      "reason": "Security-focused reason why this file is risky (e.g. handles user input, auth, crypto, network).",
      "severity": "low" | "medium" | "high"
    }
  ],
  "onboarding": {
    "steps": [
      {
        "title": "Step title",
        "file": "<file_path or array of file paths>",
        "explanation": "Security-focused explanation: what to audit and why."
      }
    ]
  }
}

Rules:
- fileDescriptions must include every file from the node list above. Each description must be 2-3 plain English sentences explaining the file's role and any security implications.
- riskHotspots should prioritize: input handling, authentication, authorization, data exposure, injection points, secrets management. Include 5-10 hotspots.
- onboarding steps should guide a security reviewer through the codebase in order of risk. Include 4-8 steps.
- Return ONLY valid JSON, no markdown fences, no explanation outside the JSON.`;
}
