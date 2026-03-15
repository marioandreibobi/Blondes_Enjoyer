"use client";

import React, { useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Check, Brain, ShieldCheck } from "lucide-react";
import { useGraphStore } from "@/store/graph-store";
import ForceGraph from "@/components/Graph/ForceGraph";
import DiagramView from "@/components/Graph/DiagramView";
import ViewSwitcher from "@/components/UI/ViewSwitcher";
import AnalysisPanel from "@/components/UI/AnalysisPanel";
import LoadingState from "@/components/UI/LoadingState";
import ErrorBoundary from "@/components/UI/ErrorBoundary";
import NavBar from "@/components/UI/NavBar";
import ChatPanel from "@/components/Chat/ChatPanel";
import type { AnalyzeResponse, AnalysisResult } from "@/types";

/* ─── Small reusable panel for one AI approach ─── */
function ApproachPanel({
  label,
  icon,
  result,
  color,
  chosen,
  onChoose,
}: {
  label: string;
  icon: React.ReactNode;
  result: AnalysisResult;
  color: string;
  chosen: boolean;
  onChoose: () => void;
}): React.ReactElement {
  const riskCount = result.ai.riskHotspots.length;
  const highRisks = result.ai.riskHotspots.filter((r) => r.severity === "high").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex-1 flex flex-col rounded-xl overflow-hidden border"
      style={{
        background: "rgba(15,19,40,0.85)",
        borderColor: chosen ? color : "rgba(255,255,255,0.08)",
        boxShadow: chosen ? `0 0 20px ${color}33` : "none",
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid ${chosen ? color + "44" : "rgba(255,255,255,0.06)"}` }}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-white">{label}</span>
        </div>
        <button
          onClick={onChoose}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200"
          style={{
            background: chosen ? color : "rgba(255,255,255,0.06)",
            color: chosen ? "#fff" : "rgba(255,255,255,0.6)",
            border: `1px solid ${chosen ? color : "rgba(255,255,255,0.1)"}`,
          }}
        >
          {chosen ? <Check className="h-3 w-3" /> : null}
          {chosen ? "Chosen" : "Choose this"}
        </button>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 flex-1 overflow-y-auto space-y-4">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: color }}>
            Summary
          </h4>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
            {result.ai.summary || "No summary available."}
          </p>
        </div>

        {/* Risk stats */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: color }}>
            Risk Hotspots ({riskCount})
          </h4>
          <div className="space-y-1.5">
            {result.ai.riskHotspots.slice(0, 5).map((r, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <span
                  className="mt-0.5 h-2 w-2 rounded-full shrink-0"
                  style={{
                    background:
                      r.severity === "high" ? "#ef4444" : r.severity === "medium" ? "#f59e0b" : "#22c55e",
                  }}
                />
                <div>
                  <span className="font-mono text-white/60">{r.file}</span>
                  <p className="text-white/50 mt-0.5">{r.reason}</p>
                </div>
              </div>
            ))}
            {riskCount > 5 && (
              <p className="text-[11px] text-white/30 pl-3">+{riskCount - 5} more hotspots</p>
            )}
          </div>
        </div>

        {/* Onboarding steps preview */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: color }}>
            Onboarding ({result.ai.onboarding.steps.length} steps)
          </h4>
          <div className="space-y-1">
            {result.ai.onboarding.steps.slice(0, 4).map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <span className="text-white/30 font-mono">{i + 1}.</span>
                <span className="text-white/60">{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 pt-2 text-[11px] text-white/40">
          <span>{result.graph.nodes.length} nodes</span>
          <span>{result.graph.links.length} links</span>
          <span>{highRisks} high risks</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main page ─── */
export default function AnalyzePage(): React.ReactElement {
  const params = useParams<{ owner: string; repo: string }>();
  const searchParams = useSearchParams();
  const isDualFromUrl = searchParams.get("dual") === "1";
  const {
    setAnalysisResult,
    setAnalysisResultB,
    setDualMode,
    setLoading,
    setError,
    loading,
    error,
    analysisResult,
    analysisResultB,
    dualMode,
    chosenApproach,
    setChosenApproach,
    activeView,
    setActiveView,
    activeCategory,
    setActiveCategory,
  } = useGraphStore();

  useEffect(() => {
    if (isDualFromUrl) {
      setDualMode(true);
    }

    const controller = new AbortController();

    async function load(): Promise<void> {
      setLoading(true);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      try {
        const url = `https://github.com/${params.owner}/${params.repo}`;
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoUrl: url, dualMode: isDualFromUrl }),
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load analysis");
        }

        const data: AnalyzeResponse = await res.json();
        if (controller.signal.aborted) return;

        setAnalysisResult(data.result);
        if (data.resultB) {
          setAnalysisResultB(data.resultB);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof Error && err.name === "AbortError") {
          setError("Analysis timed out. The repository is large or external services are slow. Please retry.");
        } else {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    load();

    return () => { controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.owner, params.repo, isDualFromUrl]);

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
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#1A1411" }}>
        <LoadingState />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#1A1411" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-3 rounded-xl p-8"
          style={{ background: "rgba(37,30,24,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-lg font-medium text-red-400">Error</p>
          <p className="text-sm text-[#9A8F87] max-w-sm">{error}</p>
          <a
            href="/"
            className="inline-block mt-2 rounded-lg px-5 py-2 text-sm font-medium text-white hover:opacity-90 transition-all"
            style={{ background: "rgba(224,123,84,0.8)" }}
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

  /* ── Dual mode: show comparison before the graph ── */
  const showComparison = dualMode && analysisResultB && !chosenApproach;

  if (showComparison) {
    return (
      <ErrorBoundary>
        <NavBar showCta={false} />
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen flex flex-col pt-14"
          style={{ background: "#1A1411" }}
        >
          {/* Header */}
          <header
            className="flex items-center justify-between px-5 py-3"
            style={{ background: "rgba(28,22,18,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-white">
                Dual AI Comparison
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-md" style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.04)" }}>
                {analysisResult.repo.owner}/{analysisResult.repo.name}
              </span>
            </div>
            <p className="text-xs text-white/40">Choose the analysis you prefer, then explore the graph</p>
          </header>

          {/* Split panels */}
          <div className="flex-1 flex gap-4 p-4 overflow-hidden">
            <ApproachPanel
              label="Architecture Focus"
              icon={<Brain className="h-4 w-4 text-primary" />}
              result={analysisResult}
              color="rgb(224,123,84)"
              chosen={false}
              onChoose={() => setChosenApproach("A")}
            />
            <ApproachPanel
              label="Security Focus"
              icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}
              result={analysisResultB!}
              color="rgb(16,185,129)"
              chosen={false}
              onChoose={() => setChosenApproach("B")}
            />
          </div>
        </motion.main>
      </ErrorBoundary>
    );
  }

  /* ── Normal single-result view ── */
  return (
    <ErrorBoundary>
      <NavBar showCta={false} />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-screen flex flex-col pt-14"
        style={{ background: "#1A1411" }}
      >
        {/* ─── Header bar ─── */}
        <header
          className="flex items-center justify-between px-5 py-2.5"
          style={{ background: "rgba(28,22,18,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
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
              <span className="font-semibold" style={{ color: "#D4A857" }}>DEPS</span>{" "}
              <span style={{ color: "#D4A857" }}>{totalDeps}</span>
            </span>
            {chosenApproach && (
              <span
                className="text-xs px-2 py-0.5 rounded-md font-medium"
                style={{
                  color: chosenApproach === "A" ? "rgb(129,140,248)" : "rgb(52,211,153)",
                  background: chosenApproach === "A" ? "rgba(224,123,84,0.15)" : "rgba(16,185,129,0.15)",
                }}
              >
                {chosenApproach === "A" ? "Architecture" : "Security"} approach
              </span>
            )}
          </div>

          {/* Right: view switcher + export */}
          <ViewSwitcher value={activeView} onSwitch={setActiveView} onExport={handleExport} />
        </header>

        {/* ─── Category filter tabs ─── */}
        <div
          className="flex items-center gap-1 px-5 py-2"
          style={{ background: "rgba(28,22,18,0.9)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
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
                    ? { background: "rgba(224,123,84,0.8)", color: "#fff" }
                    : { background: "transparent", color: "rgba(255,255,255,0.45)" }
                }
              >
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* ─── Body ─── */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main content area */}
          <div className="flex-1 relative overflow-hidden">
            {activeView === "diagram" ? (
              <DiagramView />
            ) : (
              <ForceGraph />
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
