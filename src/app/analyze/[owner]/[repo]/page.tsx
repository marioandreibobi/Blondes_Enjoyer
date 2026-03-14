"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useGraphStore } from "@/store/graph-store";
import ForceGraph from "@/components/Graph/ForceGraph";
import DiagramView from "@/components/Graph/DiagramView";
import NodeTooltip from "@/components/Graph/NodeTooltip";
import Sidebar from "@/components/UI/Sidebar";
import LoadingState from "@/components/UI/LoadingState";
import ErrorBoundary from "@/components/UI/ErrorBoundary";
import NavBar from "@/components/UI/NavBar";
import ViewSwitcher from "@/components/UI/ViewSwitcher";
import ChatPanel from "@/components/Chat/ChatPanel";
import type { AnalyzeResponse } from "@/types";

export default function AnalyzePage(): React.ReactElement {
  const params = useParams<{ owner: string; repo: string }>();
  const { setAnalysisResult, setLoading, setError, loading, error, analysisResult, activeView, setActiveView } =
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
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#0a0e27" }}>
        <LoadingState />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#0a0e27" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-3 rounded-xl p-8"
          style={{ background: "rgba(15,19,40,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-lg font-medium text-red-400">Error</p>
          <p className="text-sm text-slate-400 max-w-sm">{error}</p>
          <a
            href="/"
            className="inline-block mt-2 rounded-lg px-5 py-2 text-sm font-medium text-white hover:opacity-90 transition-all"
            style={{ background: "rgba(99,102,241,0.8)" }}
          >
            Back to Home
          </a>
        </motion.div>
      </main>
    );
  }

  if (!analysisResult) return <></>;

  return (
    <ErrorBoundary>
      <NavBar showCta={false} />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-screen flex flex-col pt-14"
        style={{ background: "#0a0e27" }}
      >
        {/* Minimal header bar */}
        <header
          className="flex items-center justify-between px-5 py-2.5"
          style={{ background: "rgba(10,14,39,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-sm font-mono font-medium"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              {analysisResult.repo.owner}/{analysisResult.repo.name}
            </span>
            <span
              className="text-xs font-mono px-2 py-0.5 rounded-md"
              style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.04)" }}
            >
              {analysisResult.repo.analyzedFiles}/{analysisResult.repo.totalFiles} files
            </span>
          </div>
          <ViewSwitcher value={activeView} onSwitch={setActiveView} />
        </header>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {activeView === "3d" ? (
            <>
              <div className="flex-1 relative">
                <ForceGraph />
                <NodeTooltip />
              </div>
              <Sidebar />
            </>
          ) : (
            <DiagramView />
          )}
        </div>

        {/* AI Chat */}
        <ChatPanel />
      </motion.main>
    </ErrorBoundary>
  );
}
