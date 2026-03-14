"use client";

import React, { useState, useMemo } from "react";
import { X, AlertTriangle, GitBranch, FileCode, ChevronRight } from "lucide-react";
import { useGraphStore } from "@/store/graph-store";
import type { GraphNode, NodeType } from "@/types";

// ─── Category mapping ─────────────────────────────────────────

type CategoryType = "core" | "middleware" | "services" | "utilities" | "qa" | "configuration";

const SECTIONS: CategoryType[] = ["core", "middleware", "services", "utilities", "qa", "configuration"];

const SECTION_LABELS: Record<CategoryType, string> = {
  core: "CORE",
  middleware: "MIDDLEWARE",
  services: "SERVICES",
  utilities: "UTILITIES",
  qa: "QA & TESTING",
  configuration: "CONFIGURATION",
};

const SECTION_SUBTITLES: Record<CategoryType, string> = {
  core: "Application core & pages",
  middleware: "Request processing layers",
  services: "Business logic & external integrations",
  utilities: "Components, helpers & state",
  qa: "Tests & quality assurance",
  configuration: "Build & project config",
};

function getCategory(type: NodeType): CategoryType {
  if (type === "middleware") return "middleware";
  if (type === "service" || type === "model") return "services";
  if (type === "test") return "qa";
  if (type === "config") return "configuration";
  if (type === "util") return "utilities";
  return "core";
}

// ─── Color definitions ────────────────────────────────────────

const NODE_COLORS: Record<CategoryType, { dot: string; bg: string; border: string; text: string }> = {
  core:          { dot: "#3b82f6", bg: "rgba(59,130,246,0.15)",  border: "rgba(59,130,246,0.5)",  text: "#60a5fa" },
  middleware:    { dot: "#f59e0b", bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.5)",  text: "#fbbf24" },
  services:      { dot: "#22c55e", bg: "rgba(34,197,94,0.15)",   border: "rgba(34,197,94,0.5)",   text: "#4ade80" },
  utilities:     { dot: "#facc15", bg: "rgba(250,204,21,0.15)",  border: "rgba(250,204,21,0.5)",  text: "#fde047" },
  qa:            { dot: "#ec4899", bg: "rgba(236,72,153,0.15)",  border: "rgba(236,72,153,0.5)",  text: "#f472b6" },
  configuration: { dot: "#f97316", bg: "rgba(249,115,22,0.15)",  border: "rgba(249,115,22,0.5)",  text: "#fb923c" },
};

const NODE_TYPE_LABELS: Record<CategoryType, string> = {
  core: "Core",
  middleware: "Middleware",
  services: "Services",
  utilities: "Utilities",
  qa: "QA & Testing",
  configuration: "Configuration",
};

const RISK_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#fbbf24",
  high: "#ef4444",
  critical: "#dc2626",
};

function getRiskLevel(risk: string | null): string {
  if (!risk) return "low";
  const r = risk.toLowerCase();
  if (r.includes("critical")) return "critical";
  if (r.includes("high")) return "high";
  if (r.includes("medium")) return "medium";
  return "low";
}

function getRiskColor(risk: string | null): string {
  return RISK_COLORS[getRiskLevel(risk)] ?? RISK_COLORS.low;
}

function complexityToNumber(c: string): number {
  if (c === "high") return 85;
  if (c === "medium") return 55;
  return 25;
}

// ─── Derived node with display fields ─────────────────────────

interface DisplayNode {
  id: string;
  name: string;
  path: string;
  description: string;
  lines: number;
  imports: number;
  importedBy: number;
  risk: string | null;
  complexity: number;
  complexityLabel: string;
  type: NodeType;
  category: CategoryType;
  dependencies: string[];
}

function toDisplayNode(node: GraphNode, depNames: string[]): DisplayNode {
  return {
    id: node.id,
    name: node.id.split("/").pop() ?? node.id,
    path: node.id,
    description: node.description,
    lines: node.lines,
    imports: node.imports,
    importedBy: node.importedBy,
    risk: node.risk,
    complexity: complexityToNumber(node.complexity),
    complexityLabel: node.complexity,
    type: node.type,
    category: getCategory(node.type),
    dependencies: depNames,
  };
}

// ─── NodeCard ─────────────────────────────────────────────────

interface NodeCardProps {
  node: DisplayNode;
  onClick: (node: DisplayNode) => void;
  isSelected: boolean;
}

function NodeCard({ node, onClick, isSelected }: NodeCardProps): React.ReactElement {
  const colors = NODE_COLORS[node.category];
  const riskColor = getRiskColor(node.risk);

  return (
    <button
      onClick={() => onClick(node)}
      style={{
        background: isSelected ? colors.bg : "rgba(15, 23, 42, 0.6)",
        border: `1px solid ${isSelected ? colors.border : "rgba(56, 189, 248, 0.08)"}`,
        boxShadow: isSelected ? `0 0 12px ${colors.dot}33` : "none",
      }}
      className="group relative w-full text-left rounded-lg p-3 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode size={12} style={{ color: colors.dot, flexShrink: 0 }} />
          <span className="font-mono text-xs font-semibold truncate" style={{ color: colors.text }}>
            {node.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: riskColor }}
          />
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
        <span>{node.lines}L</span>
        {node.dependencies.length > 0 && (
          <>
            <span className="opacity-40">·</span>
            <span>{node.dependencies.length}d</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          <div className="h-1 w-10 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${node.complexity}%`,
                backgroundColor: node.complexity > 75 ? "#ef4444" : node.complexity > 50 ? "#fbbf24" : "#22c55e",
              }}
            />
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── InspectorPanel ───────────────────────────────────────────

interface InspectorPanelProps {
  node: DisplayNode;
  onClose: () => void;
}

function InspectorPanel({ node, onClose }: InspectorPanelProps): React.ReactElement {
  const colors = NODE_COLORS[node.category];
  const riskColor = getRiskColor(node.risk);
  const riskLevel = getRiskLevel(node.risk);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">Inspector</p>
          <h3 className="font-mono text-sm font-bold" style={{ color: colors.text }}>
            {node.name}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Path</p>
          <p className="font-mono text-xs text-slate-300 break-all leading-relaxed">{node.path}</p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Description</p>
          <p className="text-xs text-slate-300 leading-relaxed">{node.description}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg p-2.5" style={{ background: "rgba(56, 189, 248, 0.06)", border: "1px solid rgba(56, 189, 248, 0.12)" }}>
            <p className="text-[9px] uppercase tracking-widest text-slate-500">Lines</p>
            <p className="text-lg font-bold mt-0.5" style={{ color: "#38bdf8" }}>{node.lines}</p>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: "rgba(56, 189, 248, 0.06)", border: "1px solid rgba(56, 189, 248, 0.12)" }}>
            <p className="text-[9px] uppercase tracking-widest text-slate-500">Deps</p>
            <p className="text-lg font-bold mt-0.5" style={{ color: "#38bdf8" }}>{node.dependencies.length}</p>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: `${riskColor}10`, border: `1px solid ${riskColor}22` }}>
            <p className="text-[9px] uppercase tracking-widest text-slate-500">Risk</p>
            <p className="text-lg font-bold mt-0.5 capitalize" style={{ color: riskColor }}>{riskLevel}</p>
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Complexity</p>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${node.complexity}%`,
                background:
                  node.complexity > 75
                    ? "linear-gradient(90deg, #f97316, #ef4444)"
                    : node.complexity > 50
                      ? "linear-gradient(90deg, #fbbf24, #f97316)"
                      : "linear-gradient(90deg, #22c55e, #fbbf24)",
              }}
            />
          </div>
          <p className="text-right text-[10px] text-slate-500 mt-1">{node.complexity}/100</p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
            <GitBranch size={10} />
            Dependencies
          </p>
          {node.dependencies.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No dependencies</p>
          ) : (
            <div className="space-y-1">
              {node.dependencies.map((dep) => (
                <div
                  key={dep}
                  className="flex items-center gap-1.5 py-1 px-2 rounded text-xs font-mono"
                  style={{ background: "rgba(56, 189, 248, 0.05)", border: "1px solid rgba(56, 189, 248, 0.1)" }}
                >
                  <ChevronRight size={8} className="opacity-60" style={{ color: "#38bdf8" }} />
                  <span className="text-slate-400">{dep}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Category</p>
          <span
            className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border font-medium"
            style={{ background: colors.bg, borderColor: colors.border, color: colors.text }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.dot }} />
            {NODE_TYPE_LABELS[node.category]}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function DiagramView(): React.ReactElement {
  const analysisResult = useGraphStore((s) => s.analysisResult);
  const typeFilters = useGraphStore((s) => s.typeFilters);
  const complexityFilter = useGraphStore((s) => s.complexityFilter);

  const [selectedNode, setSelectedNode] = useState<DisplayNode | null>(null);
  const [filter, setFilter] = useState<CategoryType | "all">("all");

  // Build display nodes from store data
  const displayNodes = useMemo((): DisplayNode[] => {
    if (!analysisResult) return [];
    let nodes = analysisResult.graph.nodes;
    if (typeFilters.size > 0) nodes = nodes.filter((n) => !typeFilters.has(n.type));
    if (complexityFilter !== "all") nodes = nodes.filter((n) => n.complexity === complexityFilter);

    // Build dependency name map from links
    const depMap = new Map<string, string[]>();
    for (const link of analysisResult.graph.links) {
      const src = typeof link.source === "string" ? link.source : String(link.source);
      const tgt = typeof link.target === "string" ? link.target : String(link.target);
      const tgtName = tgt.split("/").pop() ?? tgt;
      if (!depMap.has(src)) depMap.set(src, []);
      depMap.get(src)!.push(tgtName);
    }

    return nodes.map((n) => toDisplayNode(n, depMap.get(n.id) ?? []));
  }, [analysisResult, typeFilters, complexityFilter]);

  // Group by category
  const nodesByCategory = useMemo(() => {
    const map: Record<CategoryType, DisplayNode[]> = {
      core: [], middleware: [], services: [], utilities: [], qa: [], configuration: [],
    };
    for (const node of displayNodes) {
      map[node.category].push(node);
    }
    return map;
  }, [displayNodes]);

  const filteredSections = filter === "all" ? SECTIONS : SECTIONS.filter((s) => s === filter);
  const totalFiles = displayNodes.length;
  const totalLines = displayNodes.reduce((sum, n) => sum + n.lines, 0);

  if (!analysisResult || displayNodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ color: "rgba(255,255,255,0.3)" }}>
        <p className="text-sm font-mono">No files to display</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div
        className="flex-1 overflow-y-auto"
        style={{
          background: "#0a0e27",
          backgroundImage: "radial-gradient(circle, rgba(56,189,248,0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.7)" }}>
                City Map View
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {totalFiles} files · {totalLines.toLocaleString()} lines
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <button
                onClick={() => setFilter("all")}
                className="px-3 py-1 text-xs rounded-full border transition-all"
                style={{
                  background: filter === "all" ? "rgba(56, 189, 248, 0.15)" : "transparent",
                  borderColor: filter === "all" ? "rgba(56, 189, 248, 0.5)" : "rgba(255,255,255,0.08)",
                  color: filter === "all" ? "#38bdf8" : "#64748b",
                }}
              >
                All
              </button>
              {SECTIONS.map((type) => {
                const colors = NODE_COLORS[type];
                return (
                  <button
                    key={type}
                    onClick={() => setFilter(type === filter ? "all" : type)}
                    className="px-3 py-1 text-xs rounded-full border transition-all"
                    style={{
                      background: filter === type ? colors.bg : "transparent",
                      borderColor: filter === type ? colors.border : "rgba(255,255,255,0.08)",
                      color: filter === type ? colors.text : "#64748b",
                    }}
                  >
                    {SECTION_LABELS[type]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-8">
            {filteredSections.map((type) => {
              const nodes = nodesByCategory[type];
              if (!nodes || nodes.length === 0) return null;
              const colors = NODE_COLORS[type];

              return (
                <div key={type} className="group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors.dot }} />
                    <div>
                      <span className="text-xs font-bold tracking-widest uppercase" style={{ color: colors.text }}>
                        {SECTION_LABELS[type]}
                      </span>
                      <span className="ml-2 text-[10px] text-slate-500">{SECTION_SUBTITLES[type]}</span>
                    </div>
                    <div className="flex-1 h-px" style={{ background: colors.border + "30" }} />
                    <span className="text-[10px] text-slate-500">{nodes.length} files</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    {nodes.map((node) => (
                      <NodeCard
                        key={node.id}
                        node={node}
                        onClick={setSelectedNode}
                        isSelected={selectedNode?.id === node.id}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inspector sidebar */}
      <div
        className="w-72 flex-shrink-0 transition-all duration-300"
        style={{
          background: "rgba(11, 17, 32, 0.92)",
          borderLeft: "1px solid rgba(56, 189, 248, 0.12)",
        }}
      >
        {selectedNode ? (
          <InspectorPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
              style={{ background: "rgba(56, 189, 248, 0.06)", border: "1px solid rgba(56, 189, 248, 0.12)" }}
            >
              <FileCode size={20} style={{ color: "rgba(56,189,248,0.5)" }} />
            </div>
            <p className="text-xs font-medium text-slate-500">Click a file to inspect</p>
            <p className="text-[10px] text-slate-600 mt-1">
              View details, dependencies,
              <br />
              and risk analysis
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
