"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, AlertTriangle } from "lucide-react";
import { useGraphStore } from "@/store/graph-store";

const DISTRICT_LEGEND = [
  { name: "City Center", color: "#E07B54" },
  { name: "Commerce", color: "#D4A857" },
  { name: "Industrial", color: "#9C7FCB" },
  { name: "Intelligence", color: "#C96E45" },
  { name: "QA & Testing", color: "#6BAF7C" },
  { name: "Infrastructure", color: "#6B5E56" },
  { name: "UI Quarter", color: "#D4A857" },
];

const TYPE_ICONS: Record<string, string> = {
  entry: "🏛", route: "🛤", controller: "🏢", service: "⚙",
  middleware: "🔒", model: "📦", util: "🔧", config: "📋", test: "🧪",
};

export default function Sidebar(): React.ReactElement {
  const selectedNode = useGraphStore((s) => s.selectedNode);
  const sidebarOpen = useGraphStore((s) => s.sidebarOpen);
  const toggleSidebar = useGraphStore((s) => s.toggleSidebar);
  const analysisResult = useGraphStore((s) => s.analysisResult);

  if (!sidebarOpen) {
    return (
      <button
        onClick={toggleSidebar}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 px-2 py-4 rounded-l-lg transition-all"
        style={{
          background: "rgba(28,22,18,0.9)",
          border: "1px solid rgba(61,48,40,0.5)",
          borderRight: "none",
          color: "rgba(255,255,255,0.4)",
        }}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    );
  }

  const risk = analysisResult?.ai.riskHotspots.find(
    (h) => h.file === selectedNode?.id
  );

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-72 h-full overflow-y-auto flex flex-col"
        style={{
          background: "rgba(28,22,18,0.95)",
          borderLeft: "1px solid rgba(61,48,40,0.5)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid rgba(61,48,40,0.5)" }}
        >
          <h2 className="text-xs font-mono font-semibold tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
            INSPECTOR
          </h2>
          <button
            onClick={toggleSidebar}
            className="transition-colors"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Selected file details */}
        {selectedNode ? (
          <div className="p-4 space-y-4">
            {/* File header */}
            <div className="flex items-start gap-2">
              <span className="text-lg flex-shrink-0">{TYPE_ICONS[selectedNode.type] ?? "📄"}</span>
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
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
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
          </div>
        ) : (
          <div className="p-4 text-xs font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
            Click a building to inspect
          </div>
        )}

        {/* District legend */}
        <div className="mt-auto">
          <div
            className="px-4 py-3"
            style={{ borderTop: "1px solid rgba(61,48,40,0.5)" }}
          >
            <p className="text-[9px] font-mono font-semibold uppercase tracking-wider mb-2.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              DISTRICTS
            </p>
            <div className="space-y-1.5">
              {DISTRICT_LEGEND.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ background: d.color, boxShadow: `0 0 6px ${d.color}40` }}
                  />
                  <span className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {d.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Summary */}
          {analysisResult?.ai.summary && (
            <div
              className="px-4 py-3"
              style={{ borderTop: "1px solid rgba(61,48,40,0.5)" }}
            >
              <p className="text-[9px] font-mono font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                AI SUMMARY
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                {analysisResult.ai.summary}
              </p>
            </div>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

