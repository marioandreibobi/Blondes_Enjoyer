"use client";

import React, { useState, useMemo } from "react";
import { useGraphStore } from "@/store/graph-store";
import type { GraphNode, NodeType } from "@/types";

// ─── Category definitions ─────────────────────────────────────

interface Category {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  types: NodeType[];
}

const CATEGORIES: Category[] = [
  { id: "core", name: "CORE", subtitle: "Application core", color: "#22c55e", types: ["entry", "route", "controller"] },
  { id: "middleware", name: "MIDDLEWARE", subtitle: "Built-in middleware", color: "#f59e0b", types: ["middleware"] },
  { id: "services", name: "SERVICES", subtitle: "Core libraries & services", color: "#a855f7", types: ["service", "model"] },
  { id: "utilities", name: "UTILITIES", subtitle: "Utilities & helpers", color: "#06b6d4", types: ["util"] },
  { id: "testing", name: "QA & TESTING", subtitle: "Tests & quality assurance", color: "#ec4899", types: ["test"] },
  { id: "config", name: "CONFIGURATION", subtitle: "Build & project config", color: "#3b82f6", types: ["config"] },
];

// ─── SVG Icons per type ───────────────────────────────────────

const ICON_COMMON = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function FileIcon({ type }: { type: NodeType }): React.ReactElement {
  switch (type) {
    case "entry":
      return (
        <svg {...ICON_COMMON}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "route":
      return (
        <svg {...ICON_COMMON}>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case "controller":
      return (
        <svg {...ICON_COMMON}>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    case "service":
      return (
        <svg {...ICON_COMMON}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case "middleware":
      return (
        <svg {...ICON_COMMON}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "model":
      return (
        <svg {...ICON_COMMON}>
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      );
    case "util":
      return (
        <svg {...ICON_COMMON}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      );
    case "config":
      return (
        <svg {...ICON_COMMON}>
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      );
    case "test":
      return (
        <svg {...ICON_COMMON}>
          <path d="M9 3h6l-2 7h4L7 21l2-9H5L9 3z" />
        </svg>
      );
    default:
      return (
        <svg {...ICON_COMMON}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function complexityColor(c: string): string {
  switch (c) {
    case "high": return "#ef4444";
    case "medium": return "#f59e0b";
    default: return "#22c55e";
  }
}

function getCategoryForType(type: NodeType): Category | undefined {
  return CATEGORIES.find((c) => c.types.includes(type));
}

// ─── Component ────────────────────────────────────────────────

export default function DiagramView(): React.ReactElement {
  const analysisResult = useGraphStore((s) => s.analysisResult);
  const selectNode = useGraphStore((s) => s.selectNode);
  const selectedNode = useGraphStore((s) => s.selectedNode);
  const typeFilters = useGraphStore((s) => s.typeFilters);
  const complexityFilter = useGraphStore((s) => s.complexityFilter);

  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Filter nodes
  const filteredNodes = useMemo((): GraphNode[] => {
    if (!analysisResult) return [];
    let nodes = analysisResult.graph.nodes;
    if (typeFilters.size > 0) nodes = nodes.filter((n) => !typeFilters.has(n.type));
    if (complexityFilter !== "all") nodes = nodes.filter((n) => n.complexity === complexityFilter);
    return nodes;
  }, [analysisResult, typeFilters, complexityFilter]);

  // Group into categories
  const categorizedNodes = useMemo(() => {
    const result: Array<{ category: Category; nodes: GraphNode[] }> = [];
    const assigned = new Set<string>();

    for (const cat of CATEGORIES) {
      const catNodes = filteredNodes.filter((n) => cat.types.includes(n.type) && !assigned.has(n.id));
      catNodes.forEach((n) => assigned.add(n.id));
      if (catNodes.length > 0) {
        result.push({ category: cat, nodes: catNodes });
      }
    }

    const remaining = filteredNodes.filter((n) => !assigned.has(n.id));
    if (remaining.length > 0) {
      result.push({
        category: { id: "other", name: "OTHER", subtitle: "Miscellaneous files", color: "#64748b", types: [] },
        nodes: remaining,
      });
    }

    return result;
  }, [filteredNodes]);

  // Risk lookup
  const riskMap = useMemo(() => {
    if (!analysisResult) return new Map<string, { file: string; reason: string; severity: string }>();
    const map = new Map<string, (typeof analysisResult.ai.riskHotspots)[0]>();
    for (const r of analysisResult.ai.riskHotspots) map.set(r.file, r);
    return map;
  }, [analysisResult]);

  const totalFiles = filteredNodes.length;
  const totalLoc = filteredNodes.reduce((sum, n) => sum + n.lines, 0);
  const totalDeps = analysisResult?.graph.links.length ?? 0;
  const risk = selectedNode ? riskMap.get(selectedNode.id) : undefined;

  if (!analysisResult || filteredNodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ color: "rgba(255,255,255,0.3)" }}>
        <p className="text-sm font-mono">No files to display</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex" style={{ background: "#0a0e27" }}>
      {/* ─── Main grid area ─── */}
      <div
        className="flex-1 overflow-auto p-8"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {/* Stats bar */}
        <div
          className="flex items-center gap-4 mb-6 text-[11px] font-mono"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          <span>{totalFiles} Files</span>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
          <span>{totalLoc.toLocaleString()} LOC</span>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
          <span>{totalDeps} Dependencies</span>
        </div>

        {/* Category sections */}
        {categorizedNodes.map(({ category, nodes }) => (
          <section key={category.id} className="mb-10">
            {/* Category header */}
            <div className="mb-3">
              <h3
                className="text-[13px] font-mono font-bold tracking-widest"
                style={{ color: category.color }}
              >
                {category.name}
              </h3>
              <p
                className="text-[11px] font-mono mt-0.5"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {category.subtitle} · {nodes.length} files
              </p>
            </div>

            {/* File cards grid — 4 columns like the reference */}
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
            >
              {nodes.map((node) => {
                const fileName = node.id.split("/").pop() ?? node.id;
                const isSelected = selectedNode?.id === node.id;
                const isHovered = hoveredCard === node.id;
                const hasRisk = node.risk !== null;

                return (
                  <button
                    key={node.id}
                    type="button"
                    className="text-left rounded-lg px-3.5 py-3 relative group"
                    style={{
                      background: isSelected
                        ? "rgba(0,212,255,0.06)"
                        : isHovered
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(255,255,255,0.02)",
                      border: isSelected
                        ? "1.5px solid rgba(0,212,255,0.6)"
                        : hasRisk
                          ? "1px solid rgba(239,68,68,0.3)"
                          : "1px solid rgba(255,255,255,0.06)",
                      boxShadow: isSelected ? "0 0 12px rgba(0,212,255,0.15)" : "none",
                      transition: "all 0.15s ease-out",
                    }}
                    onClick={() => selectNode(node)}
                    onMouseEnter={() => setHoveredCard(node.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 flex-shrink-0"
                        style={{ color: category.color }}
                      >
                        <FileIcon type={node.type} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[13px] font-mono font-semibold truncate"
                          style={{ color: "#e2e8f0" }}
                        >
                          {fileName}
                        </p>
                        <p
                          className="text-[11px] font-mono mt-0.5"
                          style={{ color: "rgba(255,255,255,0.35)" }}
                        >
                          {node.lines} Lines
                        </p>
                      </div>

                      {/* Complexity dot */}
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                        style={{
                          background: complexityColor(node.complexity),
                          boxShadow: `0 0 6px ${complexityColor(node.complexity)}40`,
                        }}
                      />
                    </div>

                    {/* Risk pip — top-right */}
                    {hasRisk && (
                      <span
                        className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                        style={{
                          background: "#ef4444",
                          boxShadow: "0 0 6px rgba(239,68,68,0.5)",
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* ─── Inspector Panel ─── */}
      <aside
        className="w-72 h-full overflow-y-auto flex flex-col flex-shrink-0"
        style={{
          background: "rgba(10,14,39,0.95)",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h2
            className="text-xs font-mono font-semibold tracking-wider"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            INSPECTOR
          </h2>
          {selectedNode && (
            <button
              onClick={() => selectNode(null)}
              className="text-xs font-mono transition-colors"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              ✕
            </button>
          )}
        </div>

        {selectedNode ? (
          <div className="p-4 space-y-4">
            {/* File header */}
            <div className="flex items-start gap-2.5">
              <span
                className="mt-0.5 flex-shrink-0"
                style={{
                  color: getCategoryForType(selectedNode.type)?.color ?? "#64748b",
                }}
              >
                <FileIcon type={selectedNode.type} />
              </span>
              <div className="min-w-0">
                <p
                  className="text-sm font-mono font-semibold break-all"
                  style={{ color: "#e2e8f0" }}
                >
                  {selectedNode.id.split("/").pop()}
                </p>
                <p
                  className="text-[10px] font-mono mt-0.5 break-all"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {selectedNode.id}
                </p>
              </div>
            </div>

            {/* Stats grid — matches reference layout */}
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: "TYPE",
                  value:
                    selectedNode.type.charAt(0).toUpperCase() +
                    selectedNode.type.slice(1),
                },
                {
                  label: "COMPLEXITY",
                  value:
                    selectedNode.complexity.charAt(0).toUpperCase() +
                    selectedNode.complexity.slice(1),
                },
                { label: "LINES", value: String(selectedNode.lines) },
                { label: "IMPORTS", value: String(selectedNode.imports) },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg px-3 py-2"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <p
                    className="text-[9px] font-mono uppercase tracking-wider"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    {item.label}
                  </p>
                  <p
                    className="text-xs font-mono mt-0.5 font-medium"
                    style={{ color: "#cbd5e1" }}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Imported By — full width, prominent number */}
            <div
              className="rounded-lg px-3 py-2"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <p
                className="text-[9px] font-mono uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                IMPORTED BY
              </p>
              <p
                className="text-lg font-mono font-bold mt-0.5"
                style={{ color: "#cbd5e1" }}
              >
                {selectedNode.importedBy}
              </p>
            </div>

            {/* Description */}
            {selectedNode.description && (
              <div>
                <p
                  className="text-[9px] font-mono uppercase tracking-wider mb-1"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  DESCRIPTION
                </p>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.65)" }}
                >
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
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <p
                    className="text-[10px] font-mono font-semibold uppercase"
                    style={{ color: "#ef4444" }}
                  >
                    Risk — {risk.severity}
                  </p>
                </div>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  {risk.reason}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            className="p-4 text-xs font-mono"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            Click a file to inspect
          </div>
        )}
      </aside>
    </div>
  );
}
