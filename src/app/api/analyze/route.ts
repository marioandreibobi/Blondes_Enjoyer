import { NextRequest, NextResponse } from "next/server";
import { validateGitHubUrl } from "@/lib/url-validator";
import { fetchRepoTree, fetchFileContent, isAnalyzableFile, fetchRepoLanguage } from "@/lib/github";
import { parseFile, resolveImports } from "@/lib/parser";
import { buildGraph } from "@/lib/graph-builder";
import { analyzeWithAI, analyzeWithDeepSeek } from "@/lib/ai/analyze";
import type { AnalysisResult, AnalyzeResponse, ParsedFile, AIAnalysis } from "@/types";
import type { PrismaClient } from "@prisma/client";

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
      analyzeWithAI(repoFullName, graph.nodes, graph.links),
      AI_CALL_TIMEOUT_MS,
      "AI analysis"
    );
    const aiPromiseB = dualMode
      ? withTimeout(
          analyzeWithDeepSeek(repoFullName, graphNodesB, graph.links),
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
      console.warn("AI analysis failed, returning graph without AI insights:", settledA.reason);
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
        console.warn("DeepSeek analysis failed:", settledB.reason);
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
