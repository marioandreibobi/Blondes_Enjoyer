"use client";

import React, { useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useGraphStore } from "@/store/graph-store";
import ForceGraph from "@/components/Graph/ForceGraph";
import DiagramView from "@/components/Graph/DiagramView";
import NodeTooltip from "@/components/Graph/NodeTooltip";
import AnalysisPanel from "@/components/UI/AnalysisPanel";
import Legend from "@/components/Legend/Legend";
import LoadingState from "@/components/UI/LoadingState";
import ErrorBoundary from "@/components/UI/ErrorBoundary";
import NavBar from "@/components/UI/NavBar";
import ViewSwitcher from "@/components/UI/ViewSwitcher";
import ChatPanel from "@/components/Chat/ChatPanel";
import type { AnalyzeResponse } from "@/types";

export default function AnalyzePage(): React.ReactElement {
  const params = useParams<{ owner: string; repo: string }>();
  const { setAnalysisResult, setLoading, setError, loading, error, analysisResult, activeView, setActiveView, activeCategory, setActiveCategory } =
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

  const handleExport = useCallback((): void => {
    if (!analysisResult) return;
    const blob = new Blob([JSON.stringify(analysisResult, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codeatlas-${analysisResult.repo.owner}-${analysisResult.repo.name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [analysisResult]);

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

  const totalFiles = analysisResult.repo.analyzedFiles;
  const totalLines = analysisResult.graph.nodes.reduce((s, n) => s + n.lines, 0);
  const totalDeps = analysisResult.graph.links.length;

  const CATEGORY_TABS = [
    { id: "all", name: "All" },
    { id: "core", name: "Core" },
    { id: "services", name: "Services" },
    { id: "utilities", name: "UI" },
    { id: "testing", name: "QA" },
    { id: "config", name: "Config" },
  ];

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
        {/* ─── Header bar ─── */}
        <header
          className="flex items-center justify-between px-5 py-2.5"
          style={{ background: "rgba(10,14,39,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Left: branding + repo name */}
          <div className="flex items-center gap-4">
            <span
              className="text-sm font-mono font-bold tracking-wider"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              CODEATLAS
            </span>
            <span
              className="text-sm font-mono font-medium"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {analysisResult.repo.owner}/{analysisResult.repo.name}
            </span>
          </div>

          {/* Center: stats */}
          <div className="flex items-center gap-5 text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span>
              <span className="font-semibold" style={{ color: "#ef4444" }}>FILES</span>{" "}
              <span style={{ color: "#ef4444" }}>{totalFiles}</span>
            </span>
            <span>
              <span className="font-semibold" style={{ color: "#f59e0b" }}>LINES</span>{" "}
              <span style={{ color: "#f59e0b" }}>{totalLines.toLocaleString()}</span>
            </span>
            <span>
              <span className="font-semibold" style={{ color: "#3b82f6" }}>DEPS</span>{" "}
              <span style={{ color: "#3b82f6" }}>{totalDeps}</span>
            </span>
          </div>

          {/* Right: view switcher */}
          <ViewSwitcher value={activeView} onSwitch={setActiveView} onExport={handleExport} />
        </header>

        {/* ─── Category filter tabs (shared across both views) ─── */}
        {activeView === "3d" && (
          <div
            className="flex items-center gap-1 px-5 py-2"
            style={{ background: "rgba(10,14,39,0.9)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
          >
            {CATEGORY_TABS.map((tab) => {
              const isActive = (activeCategory ?? "all") === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id === "all" ? null : tab.id)}
                  className="px-3 py-1 rounded-full text-xs font-mono transition-all"
                  style={
                    isActive
                      ? { background: "rgba(99,102,241,0.8)", color: "#fff" }
                      : { background: "transparent", color: "rgba(255,255,255,0.45)" }
                  }
                >
                  {tab.name}
                </button>
              );
            })}
          </div>
        )}

        {/* ─── Body ─── */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main content area */}
          <div className="flex-1 relative overflow-hidden">
            {activeView === "3d" ? (
              <>
                <ForceGraph />
                <NodeTooltip />
                <Legend />
              </>
            ) : (
              <DiagramView />
            )}
          </div>

          {/* Unified Analysis Panel — always visible */}
          <AnalysisPanel />
        </div>

        {/* AI Chat */}
        <ChatPanel />
      </motion.main>
    </ErrorBoundary>
  );
}
