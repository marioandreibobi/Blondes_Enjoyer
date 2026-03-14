"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useGraphStore } from "@/store/graph-store";
import ForceGraph from "@/components/Graph/ForceGraph";
import NodeTooltip from "@/components/Graph/NodeTooltip";
import GraphControls from "@/components/Graph/GraphControls";
import Legend from "@/components/Legend/Legend";
import Sidebar from "@/components/UI/Sidebar";
import LoadingState from "@/components/UI/LoadingState";
import ErrorBoundary from "@/components/UI/ErrorBoundary";
import OnboardingPanel from "@/components/Onboarding/OnboardingPanel";
import BlueprintGrid from "@/components/UI/BlueprintGrid";
import NavBar from "@/components/UI/NavBar";
import ChatPanel from "@/components/Chat/ChatPanel";
import type { AnalyzeResponse } from "@/types";

export default function AnalyzePage(): React.ReactElement {
  const params = useParams<{ owner: string; repo: string }>();
  const { setAnalysisResult, setLoading, setError, loading, error, analysisResult } =
    useGraphStore();

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);

      try {
        const url = `https://github.com/${params.owner}/${params.repo}`;
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoUrl: url }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load analysis");
        }

        const data: AnalyzeResponse = await res.json();
        setAnalysisResult(data.result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    }

    load();
  }, [params.owner, params.repo, setAnalysisResult, setLoading, setError]);

  if (loading) {
    return (
      <>
        <BlueprintGrid />
        <main className="min-h-screen flex items-center justify-center">
          <LoadingState />
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <BlueprintGrid />
        <main className="min-h-screen flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center space-y-3 rounded-xl bg-glass border-glass shadow-blueprint p-8"
          >
            <p className="text-lg font-medium text-destructive">Error</p>
            <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
            <a
              href="/"
              className="inline-block mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 glow-primary transition-brand"
            >
              Back to Home
            </a>
          </motion.div>
        </main>
      </>
    );
  }

  if (!analysisResult) return <></>;

  return (
    <ErrorBoundary>
      <BlueprintGrid />
      <NavBar showCta={false} />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-screen flex flex-col pt-14"
      >
        {/* Header bar */}
        <header className="flex items-center justify-between px-4 py-2 border-b border-glass bg-glass">
          <span className="text-sm font-mono text-muted-foreground">
            {analysisResult.repo.owner}/{analysisResult.repo.name}
            <span className="ml-2 text-xs text-primary">
              ({analysisResult.repo.analyzedFiles}/{analysisResult.repo.totalFiles} files)
            </span>
          </span>
        </header>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Graph area */}
          <div className="flex-1 relative">
            <ForceGraph />
            <NodeTooltip />

            {/* Controls overlay */}
            <div className="absolute top-3 left-3 z-30 space-y-2 max-w-xs">
              <GraphControls />
              <Legend />
              <OnboardingPanel />
              <div className="text-[11px] font-mono px-1 text-muted-foreground">
                Click a node to inspect &middot; Scroll to zoom &middot; Drag to rotate
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <Sidebar />
        </div>

        {/* AI Chat */}
        <ChatPanel />
      </motion.main>
    </ErrorBoundary>
  );
}
