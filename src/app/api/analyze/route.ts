import { NextRequest, NextResponse } from "next/server";
import { validateGitHubUrl } from "@/lib/url-validator";
import { fetchRepoTree, fetchFileContent, isAnalyzableFile, fetchRepoLanguage } from "@/lib/github";
import { parseFile, resolveImports } from "@/lib/parser";
import { buildGraph } from "@/lib/graph-builder";
import { analyzeWithAI, analyzeWithDeepSeek } from "@/lib/ai/analyze";
import type { AnalysisResult, AnalyzeResponse, ParsedFile, AIAnalysis, GraphNode, GraphLink } from "@/types";
import type { PrismaClient } from "@prisma/client";

/* ─── Local fallback when AI is unavailable ─── */
function buildArchitectureFallback(
  repoName: string,
  nodes: GraphNode[],
  links: GraphLink[]
): { ai: AIAnalysis; descriptions: Record<string, string> } {
  const sorted = [...nodes].sort((a, b) => b.importedBy - a.importedBy);
  const highComplexity = nodes.filter((n) => n.complexity === "high");
  const entryPoints = nodes.filter((n) => n.type === "entry" || n.type === "route");
  const services = nodes.filter((n) => n.type === "service" || n.type === "controller");

  const descriptions: Record<string, string> = {};
  for (const n of nodes) {
    const fileName = n.id.split("/").pop() ?? n.id;
    const article = /^[aeiou]/i.test(n.type) ? "an" : "a";
    const usedByText = n.importedBy > 0
      ? `It is used by ${n.importedBy} other file${n.importedBy > 1 ? "s" : ""} in the project.`
      : "No other files depend on it directly.";
    const importsText = n.imports > 0
      ? `It relies on ${n.imports} other module${n.imports > 1 ? "s" : ""}.`
      : "";
    descriptions[n.id] = `This is ${article} ${n.type} file called ${fileName} with ${n.lines} lines of code. ${usedByText}${importsText ? " " + importsText : ""}`;
  }

  const riskHotspots: AIAnalysis["riskHotspots"] = sorted
    .filter((n) => n.importedBy >= 3 || n.complexity === "high" || n.lines > 150)
    .slice(0, 8)
    .map((n) => ({
      file: n.id,
      reason:
        n.importedBy >= 5
          ? `High fan-in: ${n.importedBy} files depend on this — changes here have wide blast radius`
          : n.complexity === "high"
            ? `High complexity (${n.lines} lines, ${n.imports} imports) — harder to maintain and review`
            : `Large file (${n.lines} lines) with ${n.importedBy} dependents — potential bottleneck`,
      severity: (n.importedBy >= 5 || (n.complexity === "high" && n.importedBy >= 3) ? "high" : n.complexity === "high" || n.importedBy >= 3 ? "medium" : "low") as "low" | "medium" | "high",
    }));

  const steps: AIAnalysis["onboarding"]["steps"] = [];
  if (entryPoints.length > 0) {
    steps.push({
      title: "Start at the entry points",
      file: entryPoints.slice(0, 3).map((n) => n.id),
      explanation: "These files bootstrap the application — understand the request/lifecycle flow from here.",
    });
  }
  if (services.length > 0) {
    steps.push({
      title: "Explore core services",
      file: services.slice(0, 3).map((n) => n.id),
      explanation: "Services and controllers contain the main business logic of the application.",
    });
  }
  const hubs = sorted.slice(0, 3);
  if (hubs.length > 0) {
    steps.push({
      title: "Understand the most-imported modules",
      file: hubs.map((n) => n.id),
      explanation: `These files are imported by the most other files (up to ${hubs[0].importedBy} dependents) — they form the architectural backbone.`,
    });
  }
  if (highComplexity.length > 0) {
    steps.push({
      title: "Review high-complexity files",
      file: highComplexity.slice(0, 3).map((n) => n.id),
      explanation: "These files have the highest complexity scores — they are the hardest to modify safely.",
    });
  }
  const models = nodes.filter((n) => n.type === "model" || n.type === "config");
  if (models.length > 0) {
    steps.push({
      title: "Check data models and config",
      file: models.slice(0, 3).map((n) => n.id),
      explanation: "Models and configuration define the data layer and runtime behavior.",
    });
  }

  return {
    ai: {
      summary: `${repoName} contains ${nodes.length} analyzed files with ${links.length} dependency links. The most-connected module is ${sorted[0]?.id ?? "N/A"} (imported by ${sorted[0]?.importedBy ?? 0} files). ${highComplexity.length} file(s) have high complexity. The codebase has ${entryPoints.length} entry/route files and ${services.length} service/controller files.`,
      riskHotspots,
      onboarding: { steps },
    },
    descriptions,
  };
}

function buildSecurityFallback(
  repoName: string,
  nodes: GraphNode[],
  links: GraphLink[]
): { ai: AIAnalysis; descriptions: Record<string, string> } {
  const descriptions: Record<string, string> = {};
  for (const n of nodes) {
    const fileName = n.id.split("/").pop() ?? n.id;
    const article = /^[aeiou]/i.test(n.type) ? "an" : "a";
    const surfaceLevel = n.type === "route" || n.type === "middleware" ? "HIGH" : n.type === "model" ? "MEDIUM" : "LOW";
    const surfaceText = surfaceLevel === "HIGH"
      ? "It handles incoming requests from users, which means it could be a target for attacks."
      : surfaceLevel === "MEDIUM"
        ? "It works with data storage, which means it needs careful handling to prevent data leaks."
        : "It has a low attack surface and mostly supports other parts of the application.";
    descriptions[n.id] = `This is ${article} ${n.type} file called ${fileName}. ${surfaceText} Security exposure: ${surfaceLevel}.`;
  }

  const securityRelevant = nodes.filter(
    (n) => n.type === "route" || n.type === "middleware" || n.type === "controller"
  );
  const dataLayer = nodes.filter((n) => n.type === "model" || n.id.toLowerCase().includes("auth") || n.id.toLowerCase().includes("db"));
  const configFiles = nodes.filter((n) => n.type === "config");
  const sorted = [...nodes].sort((a, b) => b.importedBy - a.importedBy);

  const riskHotspots: AIAnalysis["riskHotspots"] = [];

  for (const n of securityRelevant.slice(0, 4)) {
    riskHotspots.push({
      file: n.id,
      reason: `Handles external requests — potential injection or auth bypass surface (${n.lines} lines, complexity: ${n.complexity})`,
      severity: n.complexity === "high" ? "high" : "medium",
    });
  }
  for (const n of dataLayer.slice(0, 3)) {
    riskHotspots.push({
      file: n.id,
      reason: `Data/auth layer — risk of data exposure, insecure queries, or broken access control`,
      severity: "high",
    });
  }
  for (const n of configFiles.slice(0, 2)) {
    riskHotspots.push({
      file: n.id,
      reason: `Configuration file — may contain secrets, insecure defaults, or CORS misconfiguration`,
      severity: "medium",
    });
  }

  const steps: AIAnalysis["onboarding"]["steps"] = [];
  if (securityRelevant.length > 0) {
    steps.push({
      title: "Audit request handlers",
      file: securityRelevant.slice(0, 3).map((n) => n.id),
      explanation: "These files handle external input — check for injection, auth, and input validation.",
    });
  }
  const authFiles = nodes.filter((n) => n.id.toLowerCase().includes("auth"));
  if (authFiles.length > 0) {
    steps.push({
      title: "Review authentication flow",
      file: authFiles.map((n) => n.id),
      explanation: "Verify token handling, session management, and credential storage.",
    });
  }
  if (dataLayer.length > 0) {
    steps.push({
      title: "Inspect data access layer",
      file: dataLayer.slice(0, 3).map((n) => n.id),
      explanation: "Check for SQL/NoSQL injection, insecure queries, and data exposure risks.",
    });
  }
  if (configFiles.length > 0) {
    steps.push({
      title: "Check configuration and secrets",
      file: configFiles.map((n) => n.id),
      explanation: "Ensure no hardcoded secrets, proper CORS settings, and secure defaults.",
    });
  }
  const highFanIn = sorted.filter((n) => n.importedBy >= 3).slice(0, 3);
  if (highFanIn.length > 0) {
    steps.push({
      title: "Assess supply-chain risk in shared modules",
      file: highFanIn.map((n) => n.id),
      explanation: "Widely imported modules amplify the impact of any vulnerability they contain.",
    });
  }

  return {
    ai: {
      summary: `Security analysis of ${repoName}: ${securityRelevant.length} files handle external input (routes/middleware/controllers), ${dataLayer.length} files touch data/auth, and ${configFiles.length} config files may expose secrets. The primary attack surface is the ${securityRelevant.length} request-handling files. ${riskHotspots.filter((r) => r.severity === "high").length} high-severity risks identified.`,
      riskHotspots,
      onboarding: { steps },
    },
    descriptions,
  };
}

let prisma: PrismaClient | null = null;
if (process.env.DATABASE_URL) {
  try {
    prisma = require("@/lib/db").prisma;
  } catch {
    prisma = null;
  }
}

const MAX_FILES_TO_ANALYZE = 150;
const GITHUB_CALL_TIMEOUT_MS = 25000;
const AI_CALL_TIMEOUT_MS = 90000;

// In-memory rate limiter for analysis requests
const analyzeRateLimit = new Map<string, { count: number; firstRequest: number }>();
const ANALYZE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_ANALYZE_PER_WINDOW = 10;

function checkAnalyzeRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = analyzeRateLimit.get(ip);
  if (!entry || now - entry.firstRequest > ANALYZE_WINDOW_MS) {
    analyzeRateLimit.set(ip, { count: 1, firstRequest: now });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_ANALYZE_PER_WINDOW;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkAnalyzeRateLimit(clientIp)) {
      return NextResponse.json(
        { error: "Too many analysis requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { repoUrl, dualMode } = body;

    if (!repoUrl || typeof repoUrl !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid repoUrl" },
        { status: 400 }
      );
    }

    // Validate URL (SSRF protection)
    let owner: string;
    let repo: string;
    try {
      const parsed = validateGitHubUrl(repoUrl);
      owner = parsed.owner;
      repo = parsed.repo;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid URL";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Check cache (skip if no database or dual mode)
    if (prisma && !dualMode) {
      try {
        const existing = await prisma.analysis.findUnique({
          where: { repoOwner_repoName: { repoOwner: owner, repoName: repo } },
        });
        if (existing) {
          const result: AnalysisResult = {
            repo: {
              name: existing.repoName,
              owner: existing.repoOwner,
              language: existing.language,
              totalFiles: existing.totalFiles,
              analyzedFiles: existing.analyzedFiles,
            },
            graph: existing.graphJson as unknown as AnalysisResult["graph"],
            ai: existing.aiJson as unknown as AnalysisResult["ai"],
          };
          const response: AnalyzeResponse = { id: existing.id, result };
          return NextResponse.json(response);
        }
      } catch {
        // DB unavailable, continue without cache
      }
    }

    // Fetch repo tree
    const tree = await withTimeout(
      fetchRepoTree(owner, repo),
      GITHUB_CALL_TIMEOUT_MS,
      "Fetching repository tree"
    );
    const analyzableFiles = tree.filter(
      (item) => item.type === "blob" && isAnalyzableFile(item.path)
    );

    const totalFiles = tree.filter((item) => item.type === "blob").length;
    const filesToAnalyze = analyzableFiles.slice(0, MAX_FILES_TO_ANALYZE);

    // Fetch file contents in parallel (batched)
    const parsedFiles: ParsedFile[] = [];
    const batchSize = 10;
    for (let i = 0; i < filesToAnalyze.length; i += batchSize) {
      const batch = filesToAnalyze.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const content = await withTimeout(
            fetchFileContent(owner, repo, item.path),
            GITHUB_CALL_TIMEOUT_MS,
            `Fetching file ${item.path}`
          );
          return parseFile(item.path, content);
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          parsedFiles.push(r.value);
        }
      }
    }

    // Build dependency graph
    const allPaths = new Set(parsedFiles.map((f) => f.path));
    const resolvedImports = resolveImports(parsedFiles, allPaths);
    const graph = buildGraph(parsedFiles, resolvedImports);

    // Build file snippets for AI (first 80 lines of each file, capped at 100KB total)
    const fileSnippets: Record<string, string> = {};
    const MAX_SNIPPET_CHARS = 100_000;
    let totalChars = 0;
    for (const pf of parsedFiles) {
      const snippet = pf.content.split("\n").slice(0, 80).join("\n");
      if (totalChars + snippet.length > MAX_SNIPPET_CHARS) break;
      fileSnippets[pf.path] = snippet;
      totalChars += snippet.length;
    }

    // AI analysis
    const language = await withTimeout(
      fetchRepoLanguage(owner, repo),
      GITHUB_CALL_TIMEOUT_MS,
      "Fetching repository language"
    );
    const emptyAI: AnalysisResult["ai"] = {
      summary: "",
      riskHotspots: [],
      onboarding: { steps: [] },
    };
    // Clone graph nodes for the second approach (so merges don't interfere)
    const graphNodesB = dualMode
      ? graph.nodes.map((n) => ({ ...n }))
      : [];

    // Run AI calls in parallel when dual mode is enabled
    const repoFullName = `${owner}/${repo}`;
    const aiPromiseA = withTimeout(
      analyzeWithAI(repoFullName, graph.nodes, graph.links, fileSnippets),
      AI_CALL_TIMEOUT_MS,
      "AI analysis"
    );
    const aiPromiseB = dualMode
      ? withTimeout(
          analyzeWithDeepSeek(repoFullName, graphNodesB, graph.links, fileSnippets),
          AI_CALL_TIMEOUT_MS,
          "DeepSeek analysis"
        )
      : null;

    const settled = await Promise.allSettled(
      aiPromiseB ? [aiPromiseA, aiPromiseB] : [aiPromiseA]
    );

    // Process result A
    let ai = { ...emptyAI };
    const settledA = settled[0];
    if (settledA.status === "fulfilled") {
      const aiResult = settledA.value;
      ai = aiResult.ai;

      for (const node of graph.nodes) {
        if (aiResult.descriptions[node.id]) {
          node.description = aiResult.descriptions[node.id];
        }
      }
      for (const hotspot of ai.riskHotspots) {
        const node = graph.nodes.find((n) => n.id === hotspot.file);
        if (node) {
          node.risk = hotspot.reason;
        }
      }
    } else {
      console.warn("AI analysis failed, using local fallback:", settledA.reason);
      const fallback = buildArchitectureFallback(repoFullName, graph.nodes, graph.links);
      ai = fallback.ai;
      for (const node of graph.nodes) {
        if (fallback.descriptions[node.id]) {
          node.description = fallback.descriptions[node.id];
        }
      }
      for (const hotspot of ai.riskHotspots) {
        const node = graph.nodes.find((n) => n.id === hotspot.file);
        if (node) node.risk = hotspot.reason;
      }
    }

    const result: AnalysisResult = {
      repo: {
        name: repo,
        owner,
        language,
        totalFiles,
        analyzedFiles: parsedFiles.length,
      },
      graph,
      ai,
    };

    // Process result B (security-focused)
    let resultB: AnalysisResult | undefined;
    if (dualMode) {
      let aiB = { ...emptyAI };
      const settledB = settled[1] as PromiseSettledResult<{ ai: AIAnalysis; descriptions: Record<string, string> }> | undefined;
      if (settledB?.status === "fulfilled") {
        const aiResultB = settledB.value;
        aiB = aiResultB.ai;

        for (const node of graphNodesB) {
          if (aiResultB.descriptions[node.id]) {
            node.description = aiResultB.descriptions[node.id];
          }
        }
        for (const hotspot of aiB.riskHotspots) {
          const node = graphNodesB.find((n) => n.id === hotspot.file);
          if (node) {
            node.risk = hotspot.reason;
          }
        }
      } else if (settledB?.status === "rejected") {
        console.warn("DeepSeek analysis failed, using security fallback:", settledB.reason);
        const fallbackB = buildSecurityFallback(repoFullName, graphNodesB, graph.links);
        aiB = fallbackB.ai;
        for (const node of graphNodesB) {
          if (fallbackB.descriptions[node.id]) {
            node.description = fallbackB.descriptions[node.id];
          }
        }
        for (const hotspot of aiB.riskHotspots) {
          const node = graphNodesB.find((n) => n.id === hotspot.file);
          if (node) node.risk = hotspot.reason;
        }
      }

      resultB = {
        repo: result.repo,
        graph: { nodes: graphNodesB, links: graph.links },
        ai: aiB,
      };
    }

    // Persist (skip if no database)
    let savedId: string | undefined;
    if (prisma) {
      try {
        const saved = await prisma.analysis.create({
          data: {
            repoOwner: owner,
            repoName: repo,
            language,
            totalFiles,
            analyzedFiles: parsedFiles.length,
            graphJson: graph as object,
            aiJson: ai as object,
          },
        });
        savedId = saved.id;
      } catch {
        // DB unavailable, continue without persisting
      }
    }

    const response: AnalyzeResponse = { id: savedId ?? "no-db", result, ...(resultB ? { resultB } : {}) };
    return NextResponse.json(response);
  } catch (err) {
    console.error("Analysis failed:", err);
    const status = (err as { status?: number }).status;
    const code = (err as { code?: string }).code;

    if (status === 404) {
      return NextResponse.json(
        { error: "Repository not found. Check the URL and try again." },
        { status: 404 }
      );
    }

    if (status === 403) {
      return NextResponse.json(
        { error: "GitHub API rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const message =
      code === "concurrency_limit_exceeded"
        ? "AI service is busy. Please wait a moment and try again."
        : "Analysis failed. Please try again.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
