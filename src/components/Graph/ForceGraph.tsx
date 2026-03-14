"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useGraphStore } from "@/store/graph-store";
import type { GraphNode, NodeType } from "@/types";

// ─── NODE_TYPES (exported for NodeTooltip) ────────────────────

export const NODE_TYPES: Record<string, { color: string; label: string }> = {
  route:      { color: "#3b82f6", label: "Route" },
  controller: { color: "#3b82f6", label: "Controller" },
  entry:      { color: "#3b82f6", label: "Entry" },
  middleware: { color: "#3b82f6", label: "Middleware" },
  service:    { color: "#22c55e", label: "Service" },
  model:      { color: "#22c55e", label: "Model" },
  util:       { color: "#facc15", label: "Utility" },
  test:       { color: "#ec4899", label: "Test" },
  config:     { color: "#f97316", label: "Config" },
};

// ─── Category mapping ─────────────────────────────────────────

type CategoryType = "core" | "services" | "utilities" | "qa" | "configuration";

function getCategory(type: NodeType): CategoryType {
  if (type === "service" || type === "model") return "services";
  if (type === "test") return "qa";
  if (type === "config") return "configuration";
  if (type === "util") return "utilities";
  return "core"; // entry, route, controller, middleware
}

// Maps store's activeCategory ids to our category types
const STORE_CATEGORY_MAP: Record<string, CategoryType[]> = {
  core: ["core"],
  services: ["services"],
  utilities: ["utilities"],
  testing: ["qa"],
  config: ["configuration"],
};

// ─── Color definitions ────────────────────────────────────────

const NODE_COLORS: Record<CategoryType, { dot: string; bg: string; border: string; text: string }> = {
  core:          { dot: "#3b82f6", bg: "rgba(59,130,246,0.15)",  border: "rgba(59,130,246,0.5)",  text: "#60a5fa" },
  services:      { dot: "#22c55e", bg: "rgba(34,197,94,0.15)",   border: "rgba(34,197,94,0.5)",   text: "#4ade80" },
  utilities:     { dot: "#facc15", bg: "rgba(250,204,21,0.15)",  border: "rgba(250,204,21,0.5)",  text: "#fde047" },
  qa:            { dot: "#ec4899", bg: "rgba(236,72,153,0.15)",  border: "rgba(236,72,153,0.5)",  text: "#f472b6" },
  configuration: { dot: "#f97316", bg: "rgba(249,115,22,0.15)",  border: "rgba(249,115,22,0.5)",  text: "#fb923c" },
};

const RISK_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#fbbf24",
  high: "#ef4444",
  critical: "#dc2626",
};

function getRiskColor(risk: string | null): string {
  if (!risk) return RISK_COLORS.low;
  const r = risk.toLowerCase();
  if (r.includes("critical")) return RISK_COLORS.critical;
  if (r.includes("high")) return RISK_COLORS.high;
  if (r.includes("medium")) return RISK_COLORS.medium;
  return RISK_COLORS.low;
}

function getRiskLevel(risk: string | null): string {
  if (!risk) return "low";
  const r = risk.toLowerCase();
  if (r.includes("critical")) return "critical";
  if (r.includes("high")) return "high";
  if (r.includes("medium")) return "medium";
  return "low";
}

function complexityToNumber(c: string): number {
  if (c === "high") return 85;
  if (c === "medium") return 55;
  return 25;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Canvas node type ─────────────────────────────────────────

interface CanvasNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number;
  fy?: number;
  name: string;
  category: CategoryType;
  complexityNum: number;
}

interface CanvasEdge {
  source: string;
  target: string;
}

// ─── Component ────────────────────────────────────────────────

export default function ForceGraph(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<CanvasNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const isDragging = useRef(false);
  const dragNode = useRef<CanvasNode | null>(null);

  const analysisResult = useGraphStore((s) => s.analysisResult);
  const activeCategory = useGraphStore((s) => s.activeCategory);
  const typeFilters = useGraphStore((s) => s.typeFilters);
  const complexityFilter = useGraphStore((s) => s.complexityFilter);
  const storeSelectNode = useGraphStore((s) => s.selectNode);
  const storeHoverNode = useGraphStore((s) => s.hoverNode);

  // Map the store filter category to our category types
  const filterCategory = useMemo((): CategoryType | "all" => {
    if (!activeCategory || activeCategory === "all") return "all";
    const mapped = STORE_CATEGORY_MAP[activeCategory];
    if (mapped && mapped.length > 0) return mapped[0];
    return "all";
  }, [activeCategory]);

  // Initialize nodes and edges from store data
  useEffect(() => {
    if (!analysisResult) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    const cx = w / 2;
    const cy = h / 2;

    let sourceNodes = analysisResult.graph.nodes;
    if (typeFilters.size > 0) {
      sourceNodes = sourceNodes.filter((n) => !typeFilters.has(n.type));
    }
    if (complexityFilter !== "all") {
      sourceNodes = sourceNodes.filter((n) => n.complexity === complexityFilter);
    }

    const initialized: CanvasNode[] = sourceNodes.map((n, i) => {
      const angle = (i / sourceNodes.length) * Math.PI * 2;
      const r = 180 + Math.random() * 80;
      return {
        ...n,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        name: n.id.split("/").pop() ?? n.id,
        category: getCategory(n.type),
        complexityNum: complexityToNumber(n.complexity),
      };
    });

    const nodeIds = new Set(initialized.map((n) => n.id));
    const graphEdges: CanvasEdge[] = analysisResult.graph.links
      .map((link) => {
        const source = typeof link.source === "string" ? link.source : String(link.source);
        const target = typeof link.target === "string" ? link.target : String(link.target);
        return { source, target };
      })
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

    setNodes(initialized);
    setEdges(graphEdges);
    setSelectedNode(null);
    setHoveredNode(null);
  }, [analysisResult, typeFilters, complexityFilter]);

  // ─── Drawing ──────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const filteredNodeIds = new Set(
      filterCategory === "all"
        ? nodes.map((n) => n.id)
        : nodes.filter((n) => n.category === filterCategory).map((n) => n.id)
    );

    // Draw edges
    ctx.save();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
    ctx.lineWidth = 1;

    for (const edge of edges) {
      const src = nodes.find((n) => n.id === edge.source);
      const tgt = nodes.find((n) => n.id === edge.target);
      if (!src || !tgt) continue;
      if (!filteredNodeIds.has(src.id) || !filteredNodeIds.has(tgt.id)) continue;

      ctx.beginPath();
      ctx.setLineDash([4, 8]);
      ctx.strokeStyle =
        selectedNode?.id === src.id || selectedNode?.id === tgt.id
          ? "rgba(56, 189, 248, 0.5)"
          : "rgba(56, 189, 248, 0.1)";
      ctx.lineWidth = selectedNode?.id === src.id || selectedNode?.id === tgt.id ? 1.5 : 0.8;
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // Draw nodes
    for (const node of nodes) {
      if (!filteredNodeIds.has(node.id)) continue;
      const colors = NODE_COLORS[node.category];
      const riskColor = getRiskColor(node.risk);
      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNode?.id === node.id;
      const radius = Math.max(6, Math.min(14, 5 + node.complexityNum / 12));

      // Glow for selected/hovered
      if (isSelected || isHovered) {
        const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 3);
        grd.addColorStop(0, colors.dot + "44");
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.fillStyle = grd;
        ctx.arc(node.x, node.y, radius * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected || isHovered ? colors.dot : colors.dot + "bb";
      ctx.fill();

      // Selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = colors.dot + "88";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Risk indicator dot
      ctx.beginPath();
      ctx.arc(node.x + radius * 0.6, node.y - radius * 0.5, 2, 0, Math.PI * 2);
      ctx.fillStyle = riskColor;
      ctx.fill();

      // Label
      if (isHovered || isSelected || radius > 9) {
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = isHovered || isSelected ? "#e2e8f0" : colors.text + "aa";
        ctx.textAlign = "center";
        ctx.fillText(node.name.replace(/\.tsx?|js|py|mjs|ts$/, ""), node.x, node.y + radius + 14);
      }
    }
  }, [nodes, edges, hoveredNode, selectedNode, filterCategory]);

  // ─── Physics simulation ───────────────────────────────────

  useEffect(() => {
    if (nodes.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    const simulate = (): void => {
      setNodes((prev) => {
        const next = prev.map((n) => ({ ...n }));
        const cx = w / 2;
        const cy = h / 2;
        const k = 0.01;

        // Center gravity
        for (const n of next) {
          if (n.fx !== undefined) continue;
          n.vx += (cx - n.x) * 0.0008;
          n.vy += (cy - n.y) * 0.0008;
        }

        // Repulsion
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const dx = next[j].x - next[i].x;
            const dy = next[j].y - next[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
            const repulsion = (2400 / (dist * dist)) * k;
            if (next[i].fx === undefined) {
              next[i].vx -= (dx / dist) * repulsion;
              next[i].vy -= (dy / dist) * repulsion;
            }
            if (next[j].fx === undefined) {
              next[j].vx += (dx / dist) * repulsion;
              next[j].vy += (dy / dist) * repulsion;
            }
          }
        }

        // Edge attraction
        for (const edge of edges) {
          const src = next.find((n) => n.id === edge.source);
          const tgt = next.find((n) => n.id === edge.target);
          if (!src || !tgt) continue;
          const dx = tgt.x - src.x;
          const dy = tgt.y - src.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
          const idealLen = 120;
          const force = ((dist - idealLen) / dist) * 0.04;
          if (src.fx === undefined) {
            src.vx += dx * force;
            src.vy += dy * force;
          }
          if (tgt.fx === undefined) {
            tgt.vx -= dx * force;
            tgt.vy -= dy * force;
          }
        }

        // Damping + boundary clamping
        for (const n of next) {
          if (n.fx !== undefined) {
            n.x = n.fx;
            n.y = n.fy!;
            continue;
          }
          n.vx *= 0.85;
          n.vy *= 0.85;
          n.x += n.vx;
          n.y += n.vy;
          n.x = Math.max(20, Math.min(w - 20, n.x));
          n.y = Math.max(20, Math.min(h - 20, n.y));
        }
        return next;
      });
      animFrameRef.current = requestAnimationFrame(simulate);
    };
    animFrameRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [edges, nodes.length]);

  // Re-draw every time state changes
  useEffect(() => {
    draw();
  }, [draw]);

  // ─── Interaction helpers ──────────────────────────────────

  const getNodeAt = useCallback(
    (x: number, y: number): CanvasNode | null => {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dx = n.x - x;
        const dy = n.y - y;
        const r = Math.max(6, Math.min(14, 5 + n.complexityNum / 12));
        if (dx * dx + dy * dy <= (r + 6) * (r + 6)) return n;
      }
      return null;
    },
    [nodes]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dragging = dragNode.current;
      if (isDragging.current && dragging) {
        const dragId = dragging.id;
        setNodes((prev) =>
          prev.map((n) => (n.id === dragId ? { ...n, fx: x, fy: y, x, y } : n))
        );
        return;
      }
      const node = getNodeAt(x, y);
      setHoveredNode(node);
      storeHoverNode(node as GraphNode | null);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = node ? "pointer" : "default";
      }
    },
    [getNodeAt, storeHoverNode]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const node = getNodeAt(x, y);
      if (node) {
        isDragging.current = true;
        dragNode.current = node;
        setSelectedNode(node);
        storeSelectNode(node as GraphNode);
      } else {
        setSelectedNode(null);
        storeSelectNode(null);
      }
    },
    [getNodeAt, storeSelectNode]
  );

  const handleMouseUp = useCallback(() => {
    const released = dragNode.current;
    if (released) {
      const releaseId = released.id;
      setNodes((prev) =>
        prev.map((n) => (n.id === releaseId ? { ...n, fx: undefined, fy: undefined } : n))
      );
    }
    isDragging.current = false;
    dragNode.current = null;
  }, []);

  // ─── Filter buttons ───────────────────────────────────────

  const filterTypes: Array<{ type: CategoryType | "all"; label: string }> = [
    { type: "all", label: "All" },
    { type: "core", label: "Core" },
    { type: "services", label: "Services" },
    { type: "utilities", label: "UI" },
    { type: "qa", label: "QA" },
    { type: "configuration", label: "Config" },
  ];

  const setActiveCategory = useGraphStore((s) => s.setActiveCategory);
  const handleFilterClick = useCallback(
    (type: CategoryType | "all") => {
      const reverseMap: Record<string, string | null> = {
        all: null,
        core: "core",
        services: "services",
        utilities: "utilities",
        qa: "testing",
        configuration: "config",
      };
      setActiveCategory(reverseMap[type] ?? null);
    },
    [setActiveCategory]
  );

  // ─── Render ───────────────────────────────────────────────

  return (
    <div
      className="relative flex-1 flex flex-col h-full overflow-hidden"
      style={{
        background: "#0a0e27",
        backgroundImage: "radial-gradient(circle, rgba(56,189,248,0.04) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Filter buttons */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 flex-wrap">
        {filterTypes.map(({ type, label }) => {
          const colors = type !== "all" ? NODE_COLORS[type] : null;
          return (
            <button
              key={type}
              onClick={() => handleFilterClick(type)}
              className="px-2.5 py-1 text-[11px] rounded-full border transition-all"
              style={{
                background:
                  filterCategory === type
                    ? colors
                      ? colors.bg
                      : "rgba(56, 189, 248, 0.15)"
                    : "rgba(11,17,32,0.7)",
                borderColor:
                  filterCategory === type
                    ? colors
                      ? colors.border
                      : "rgba(56, 189, 248, 0.5)"
                    : "rgba(255,255,255,0.08)",
                color:
                  filterCategory === type
                    ? colors
                      ? colors.text
                      : "#38bdf8"
                    : "#64748b",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Selected node info panel */}
      {selectedNode && (
        <div
          className="absolute top-4 right-4 z-10 w-64 rounded-xl p-4 text-left space-y-3"
          style={{
            background: "rgba(11, 17, 32, 0.92)",
            border: `1px solid ${NODE_COLORS[selectedNode.category].border}`,
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="font-mono text-xs font-bold"
              style={{ color: NODE_COLORS[selectedNode.category].text }}
            >
              {escapeHtml(selectedNode.name)}
            </span>
            <button
              onClick={() => {
                setSelectedNode(null);
                storeSelectNode(null);
              }}
              className="text-slate-500 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">{selectedNode.description}</p>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span>{selectedNode.lines} lines</span>
            <span>·</span>
            <span>{selectedNode.imports} deps</span>
            <span>·</span>
            <span style={{ color: getRiskColor(selectedNode.risk) }} className="capitalize">
              {getRiskLevel(selectedNode.risk)} risk
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${selectedNode.complexityNum}%`,
                background:
                  selectedNode.complexityNum > 75 ? "#ef4444" : selectedNode.complexityNum > 50 ? "#fbbf24" : "#22c55e",
              }}
            />
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5">
        {(["core", "services", "utilities", "qa", "configuration"] as CategoryType[]).map((type) => (
          <div key={type} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: NODE_COLORS[type].dot }} />
            <span className="text-[10px] text-slate-500 capitalize">{type}</span>
          </div>
        ))}
        <div className="mt-1 pt-1.5 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {(["low", "medium", "high", "critical"] as const).map((risk) => (
            <div key={risk} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: RISK_COLORS[risk] }} />
              <span className="text-[9px] text-slate-500 capitalize">{risk} risk</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Hover tooltip */}
      {hoveredNode && !isDragging.current && (
        <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-0.5 pointer-events-none">
          <div
            className="px-2.5 py-1.5 rounded-lg text-xs"
            style={{
              background: "rgba(11,17,32,0.95)",
              border: `1px solid ${NODE_COLORS[hoveredNode.category].border}`,
            }}
          >
            <span style={{ color: NODE_COLORS[hoveredNode.category].text }} className="font-mono font-bold">
              {escapeHtml(hoveredNode.name)}
            </span>
            <span className="text-slate-500 ml-2 text-[10px]">{hoveredNode.lines} lines</span>
          </div>
        </div>
      )}
    </div>
  );
}