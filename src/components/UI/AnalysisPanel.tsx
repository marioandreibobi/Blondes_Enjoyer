"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, BookOpen, FileText } from "lucide-react";
import { useGraphStore } from "@/store/graph-store";

const TYPE_ICONS: Record<string, string> = {
  entry: "🏛", route: "🛤", controller: "🏢", service: "⚙",
  middleware: "🔒", model: "📦", util: "🔧", config: "📋", test: "🧪",
};

const SEVERITY_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

export default function AnalysisPanel(): React.ReactElement {
  const analysisResult = useGraphStore((s) => s.analysisResult);
  const selectedNode = useGraphStore((s) => s.selectedNode);
  const sidebarOpen = useGraphStore((s) => s.sidebarOpen);
  const toggleSidebar = useGraphStore((s) => s.toggleSidebar);
  const selectNode = useGraphStore((s) => s.selectNode);

  if (!sidebarOpen || !analysisResult) {
    return <></>;
  }

  const risk = analysisResult.ai.riskHotspots.find(
    (h) => h.file === selectedNode?.id
  );

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-80 h-full overflow-y-auto flex flex-col shrink-0"
        style={{
          background: "rgba(28,22,18,0.95)",
          borderLeft: "1px solid rgba(61,48,40,0.5)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(61,48,40,0.5)" }}
        >
          <h2
            className="text-xs font-mono font-semibold tracking-wider"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            {selectedNode ? "INSPECTOR" : "ANALYSIS"}
          </h2>
          <button
            onClick={toggleSidebar}
            className="transition-colors"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Selected node detail */}
        {selectedNode ? (
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-2">
              <span className="text-lg flex-shrink-0">
                {TYPE_ICONS[selectedNode.type] ?? "📄"}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-mono font-semibold break-all" style={{ color: "#F2EDE8" }}>
                  {selectedNode.id.split("/").pop()}
                </p>
                <p className="text-[10px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {selectedNode.id}
                </p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Type", value: selectedNode.type },
                { label: "Complexity", value: selectedNode.complexity },
                { label: "Lines", value: String(selectedNode.lines) },
                { label: "Imports", value: String(selectedNode.imports) },
                { label: "Imported By", value: String(selectedNode.importedBy) },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg px-3 py-2"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <p className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {item.label}
                  </p>
                  <p className="text-xs font-mono capitalize mt-0.5" style={{ color: "#C4BAB2" }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Description */}
            {selectedNode.description && (
              <div>
                <p className="text-[9px] font-mono uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Description
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {selectedNode.description}
                </p>
              </div>
            )}

            {/* Risk alert */}
            {risk && (
              <div
                className="rounded-lg p-3"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-3 w-3" style={{ color: "#ef4444" }} />
                  <p className="text-[10px] font-mono font-semibold uppercase" style={{ color: "#ef4444" }}>
                    Risk — {risk.severity}
                  </p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {risk.reason}
                </p>
              </div>
            )}

            <button
              onClick={() => selectNode(null)}
              className="text-[10px] font-mono underline"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              ← back to overview
            </button>
          </div>
        ) : (
          /* Overview: summary + risks + onboarding */
          <div className="p-4 space-y-5 overflow-y-auto">
            {/* AI Summary */}
            {analysisResult.ai.summary && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <FileText className="h-3.5 w-3.5" style={{ color: "rgba(224,123,84,0.8)" }} />
                  <p className="text-[9px] font-mono font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
                    AI Summary
                  </p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {analysisResult.ai.summary}
                </p>
              </div>
            )}

            {/* Risk Hotspots */}
            {analysisResult.ai.riskHotspots.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5" style={{ color: "#f59e0b" }} />
                  <p className="text-[9px] font-mono font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Risk Hotspots ({analysisResult.ai.riskHotspots.length})
                  </p>
                </div>
                <div className="space-y-1.5">
                  {analysisResult.ai.riskHotspots.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      <span
                        className="mt-0.5 h-2 w-2 rounded-full shrink-0"
                        style={{ background: SEVERITY_COLOR[r.severity] ?? "#22c55e" }}
                      />
                      <div className="min-w-0">
                        <span className="font-mono text-white/60 break-all">{r.file}</span>
                        <p className="text-white/50 mt-0.5">{r.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Onboarding Steps */}
            {analysisResult.ai.onboarding.steps.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <BookOpen className="h-3.5 w-3.5" style={{ color: "#22c55e" }} />
                  <p className="text-[9px] font-mono font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Onboarding ({analysisResult.ai.onboarding.steps.length} steps)
                  </p>
                </div>
                <div className="space-y-1.5">
                  {analysisResult.ai.onboarding.steps.map((step, i) => (
                    <div
                      key={i}
                      className="rounded-lg px-3 py-2"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white/30 font-mono text-xs">{i + 1}.</span>
                        <span className="text-xs font-medium text-white/70">{step.title}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-white/40 pl-5">
                        {step.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.aside>
    </AnimatePresence>
  );
}
