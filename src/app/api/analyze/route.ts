import { NextRequest, NextResponse } from "next/server";
import { validateGitHubUrl } from "@/lib/url-validator";
import { fetchRepoTree, fetchFileContent, isAnalyzableFile, fetchRepoLanguage } from "@/lib/github";
import { parseFile, resolveImports } from "@/lib/parser";
import { buildGraph } from "@/lib/graph-builder";
import { analyzeWithAI } from "@/lib/ai/analyze";
import { prisma } from "@/lib/db";
import type { AnalysisResult, AnalyzeResponse, ParsedFile } from "@/types";

const MAX_FILES_TO_ANALYZE = 150;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { repoUrl } = body;

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

    // Check cache
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

    // Fetch repo tree
    const tree = await fetchRepoTree(owner, repo);
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
          const content = await fetchFileContent(owner, repo, item.path);
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
    const language = await fetchRepoLanguage(owner, repo);
    const { ai, descriptions } = await analyzeWithAI(
      `${owner}/${repo}`,
      graph.nodes,
      graph.links
    );

    // Merge AI descriptions into nodes
    for (const node of graph.nodes) {
      if (descriptions[node.id]) {
        node.description = descriptions[node.id];
      }
    }

    // Merge AI risk flags
    for (const hotspot of ai.riskHotspots) {
      const node = graph.nodes.find((n) => n.id === hotspot.file);
      if (node) {
        node.risk = hotspot.reason;
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

    // Persist
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

    const response: AnalyzeResponse = { id: saved.id, result };
    return NextResponse.json(response);
  } catch (err) {
    console.error("Analysis failed:", err);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
