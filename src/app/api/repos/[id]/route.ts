import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { AnalysisResult, AnalyzeResponse } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Missing analysis ID" }, { status: 400 });
    }

    const analysis = await prisma.analysis.findUnique({ where: { id } });
    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const result: AnalysisResult = {
      repo: {
        name: analysis.repoName,
        owner: analysis.repoOwner,
        language: analysis.language,
        totalFiles: analysis.totalFiles,
        analyzedFiles: analysis.analyzedFiles,
      },
      graph: analysis.graphJson as unknown as AnalysisResult["graph"],
      ai: analysis.aiJson as unknown as AnalysisResult["ai"],
    };

    const response: AnalyzeResponse = { id: analysis.id, result };
    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch analysis" },
      { status: 500 }
    );
  }
}
