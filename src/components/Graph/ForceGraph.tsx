"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useGraphStore } from "@/store/graph-store";
import type { GraphNode, NodeType } from "@/types";

// ─── NODE_TYPES (exported for NodeTooltip) ────────────────────

export const NODE_TYPES: Record<string, { color: string; label: string }> = {
  route:      { color: "#E07B54", label: "Route" },
  controller: { color: "#E07B54", label: "Controller" },
  entry:      { color: "#E07B54", label: "Entry" },
  middleware: { color: "#9C7FCB", label: "Middleware" },
  service:    { color: "#6BAF7C", label: "Service" },
  model:      { color: "#6BAF7C", label: "Model" },
  util:       { color: "#D4A857", label: "Utility" },
  test:       { color: "#6BAF7C", label: "Test" },
  config:     { color: "#6B5E56", label: "Config" },
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

// ─── Category cluster anchors (world-space) ───────────────────

const CATEGORY_ANCHORS: Record<CategoryType, { x: number; y: number }> = {
  core:          { x: 0,    y: 0    },
  services:      { x: 500,  y: -100 },
  utilities:     { x: -500, y: 50   },
  qa:            { x: 250,  y: 450  },
  configuration: { x: -300, y: 400  },
};

// ─── Color definitions ────────────────────────────────────────

const NODE_COLORS: Record<CategoryType, { dot: string; bg: string; border: string; text: string }> = {
  core:          { dot: "#E07B54", bg: "rgba(224,123,84,0.15)",  border: "rgba(224,123,84,0.5)",  text: "#E07B54" },
  services:      { dot: "#6BAF7C", bg: "rgba(107,175,124,0.15)", border: "rgba(107,175,124,0.5)", text: "#6BAF7C" },
  utilities:     { dot: "#D4A857", bg: "rgba(212,168,87,0.15)",  border: "rgba(212,168,87,0.5)",  text: "#D4A857" },
  qa:            { dot: "#9C7FCB", bg: "rgba(156,127,203,0.15)", border: "rgba(156,127,203,0.5)", text: "#9C7FCB" },
  configuration: { dot: "#6B5E56", bg: "rgba(107,94,86,0.15)",   border: "rgba(107,94,86,0.5)",   text: "#9A8F87" },
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
  hubScore: number; // 0–1, normalized importedBy (1 = most imported)
}

// Hub threshold: nodes above this score get persistent glow + labels
const HUB_SCORE_THRESHOLD = 0.3;

function getNodeRadius(node: CanvasNode): number {
  const base = Math.max(6, Math.min(14, 5 + node.complexityNum / 12));
  const hubBonus = node.hubScore * 12;
  return base + hubBonus;
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

  // Camera state (refs for perf — no re-renders on zoom/pan)
  const zoomRef = useRef(0.55);
  const panRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panDistRef = useRef(0);
  const autoFitDoneRef = useRef(false);
  const tickCountRef = useRef(0);

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

  // ─── Screen ↔ World coordinate conversion ─────────────────

  const screenToWorld = useCallback((sx: number, sy: number): { x: number; y: number } => {
    return {
      x: (sx - panRef.current.x) / zoomRef.current,
      y: (sy - panRef.current.y) / zoomRef.current,
    };
  }, []);

  // ─── Fit to screen ────────────────────────────────────────

  const fitToScreen = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    const padding = 60;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x;
      if (n.y > maxY) maxY = n.y;
    }

    const graphW = maxX - minX || 1;
    const graphH = maxY - minY || 1;
    const zoom = Math.min((w - padding * 2) / graphW, (h - padding * 2) / graphH, 2);
    const clampedZoom = Math.max(0.15, Math.min(3, zoom));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    zoomRef.current = clampedZoom;
    panRef.current = { x: w / 2 - cx * clampedZoom, y: h / 2 - cy * clampedZoom };
  }, [nodes]);

  // ─── Initialize nodes and edges from store data ───────────

  useEffect(() => {
    if (!analysisResult) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let sourceNodes = analysisResult.graph.nodes;
    // Only show files that have at least one dependency connection
    sourceNodes = sourceNodes.filter((n) => n.imports > 0 || n.importedBy > 0);
    if (typeFilters.size > 0) {
      sourceNodes = sourceNodes.filter((n) => !typeFilters.has(n.type));
    }
    if (complexityFilter !== "all") {
      sourceNodes = sourceNodes.filter((n) => n.complexity === complexityFilter);
    }

    const scaleFactor = sourceNodes.length > 80 ? 1 + sourceNodes.length / 200 : 1;

    // Compute max importedBy for hub score normalization
    const maxImportedBy = Math.max(1, ...sourceNodes.map((n) => n.importedBy));

    const initialized: CanvasNode[] = sourceNodes.map((n, i) => {
      const cat = getCategory(n.type);
      const anchor = CATEGORY_ANCHORS[cat];
      const angle = (i / sourceNodes.length) * Math.PI * 2 + Math.random() * 0.5;
      const r = (120 + Math.random() * 100) * scaleFactor;
      return {
        ...n,
        x: anchor.x * scaleFactor + Math.cos(angle) * r,
        y: anchor.y * scaleFactor + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        name: n.id.split("/").pop() ?? n.id,
        category: cat,
        complexityNum: complexityToNumber(n.complexity),
        hubScore: n.importedBy / maxImportedBy,
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

    // Center camera on world origin
    panRef.current = { x: canvas.offsetWidth / 2, y: canvas.offsetHeight / 2 };

    setNodes(initialized);
    setEdges(graphEdges);
    setSelectedNode(null);
    setHoveredNode(null);
    autoFitDoneRef.current = false;
    tickCountRef.current = 0;
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

    const zoom = zoomRef.current;
    const pan = panRef.current;

    // Apply camera transform
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const filteredNodeIds = new Set(
      filterCategory === "all"
        ? nodes.map((n) => n.id)
        : nodes.filter((n) => n.category === filterCategory).map((n) => n.id)
    );

    // Draw edges
    for (const edge of edges) {
      const src = nodes.find((n) => n.id === edge.source);
      const tgt = nodes.find((n) => n.id === edge.target);
      if (!src || !tgt) continue;
      if (!filteredNodeIds.has(src.id) || !filteredNodeIds.has(tgt.id)) continue;

      const isHighlighted = selectedNode?.id === src.id || selectedNode?.id === tgt.id;
      ctx.beginPath();
      ctx.setLineDash([4 / zoom, 8 / zoom]);
      ctx.strokeStyle = isHighlighted ? "rgba(224,123,84,0.5)" : "rgba(61,48,40,0.3)";
      ctx.lineWidth = (isHighlighted ? 1.5 : 0.8) / zoom;
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw nodes
    for (const node of nodes) {
      if (!filteredNodeIds.has(node.id)) continue;
      const colors = NODE_COLORS[node.category];
      const riskColor = getRiskColor(node.risk);
      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNode?.id === node.id;
      const radius = getNodeRadius(node);
      const isHub = node.hubScore > HUB_SCORE_THRESHOLD;

      // Persistent hub glow (subtle aura for high-connectivity nodes)
      if (isHub && !isSelected && !isHovered) {
        const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 2.5);
        grd.addColorStop(0, colors.dot + "22");
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.fillStyle = grd;
        ctx.arc(node.x, node.y, radius * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

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
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();
      }

      // Pin indicator (small diamond) for pinned nodes
      if (node.fx !== undefined) {
        const px = node.x + radius + 4;
        const py = node.y - radius - 2;
        const s = 3;
        ctx.beginPath();
        ctx.moveTo(px, py - s);
        ctx.lineTo(px + s, py);
        ctx.lineTo(px, py + s);
        ctx.lineTo(px - s, py);
        ctx.closePath();
        ctx.fillStyle = "#fbbf24";
        ctx.fill();
      }

      // Risk indicator dot
      ctx.beginPath();
      ctx.arc(node.x + radius * 0.6, node.y - radius * 0.5, 2, 0, Math.PI * 2);
      ctx.fillStyle = riskColor;
      ctx.fill();

      // Label (constant screen-size via inverse zoom scaling)
      if (isHovered || isSelected || radius > 9 || isHub) {
        const fontSize = 11 / zoom;
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.fillStyle = isHovered || isSelected ? "#F2EDE8" : colors.text + "aa";
        ctx.textAlign = "center";
        ctx.fillText(node.name.replace(/\.(tsx?|js|py|mjs|ts)$/, ""), node.x, node.y + radius + fontSize + 2);
      }
    }

    ctx.restore();
  }, [nodes, edges, hoveredNode, selectedNode, filterCategory]);

  // ─── Physics simulation ───────────────────────────────────

  useEffect(() => {
    if (nodes.length === 0) return;

    const count = nodes.length;
    const scaleFactor = count > 80 ? 1 + count / 200 : 1;
    const repulsionStrength = 10000 * scaleFactor;
    const idealLen = 250 * scaleFactor;

    const simulate = (): void => {
      tickCountRef.current++;

      setNodes((prev) => {
        const next = prev.map((n) => ({ ...n }));

        // Very gentle center gravity (prevents infinite drift)
        for (const n of next) {
          if (n.fx !== undefined) continue;
          n.vx += (0 - n.x) * 0.0001;
          n.vy += (0 - n.y) * 0.0001;
        }

        // Category clustering force
        for (const n of next) {
          if (n.fx !== undefined) continue;
          const anchor = CATEGORY_ANCHORS[n.category];
          n.vx += (anchor.x * scaleFactor - n.x) * 0.003;
          n.vy += (anchor.y * scaleFactor - n.y) * 0.003;
        }

        // Repulsion (stronger + scales with node count)
        const k = 0.01;
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const dx = next[j].x - next[i].x;
            const dy = next[j].y - next[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
            const repulsion = (repulsionStrength / (dist * dist)) * k;
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

        // Edge attraction (longer ideal distance)
        for (const edge of edges) {
          const src = next.find((n) => n.id === edge.source);
          const tgt = next.find((n) => n.id === edge.target);
          if (!src || !tgt) continue;
          const dx = tgt.x - src.x;
          const dy = tgt.y - src.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
          const force = ((dist - idealLen) / dist) * 0.03;
          if (src.fx === undefined) {
            src.vx += dx * force;
            src.vy += dy * force;
          }
          if (tgt.fx === undefined) {
            tgt.vx -= dx * force;
            tgt.vy -= dy * force;
          }
        }

        // Damping — no boundary clamping (camera handles viewport)
        for (const n of next) {
          if (n.fx !== undefined) {
            n.x = n.fx;
            n.y = n.fy!;
            continue;
          }
          n.vx *= 0.88;
          n.vy *= 0.88;
          n.x += n.vx;
          n.y += n.vy;
        }

        // Auto-fit after initial settling (tick 40)
        if (!autoFitDoneRef.current && tickCountRef.current === 40) {
          autoFitDoneRef.current = true;
          const canvas = canvasRef.current;
          if (canvas && next.length > 0) {
            const w = canvas.offsetWidth;
            const h = canvas.offsetHeight;
            const pad = 60;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const n of next) {
              if (n.x < minX) minX = n.x;
              if (n.y < minY) minY = n.y;
              if (n.x > maxX) maxX = n.x;
              if (n.y > maxY) maxY = n.y;
            }
            const gw = maxX - minX || 1;
            const gh = maxY - minY || 1;
            const z = Math.max(0.15, Math.min(2, Math.min((w - pad * 2) / gw, (h - pad * 2) / gh)));
            zoomRef.current = z;
            panRef.current = {
              x: w / 2 - ((minX + maxX) / 2) * z,
              y: h / 2 - ((minY + maxY) / 2) * z,
            };
          }
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

  // ─── Scroll-wheel zoom (imperative for non-passive) ───────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const oldZoom = zoomRef.current;
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const newZoom = Math.max(0.15, Math.min(3, oldZoom * factor));

      panRef.current = {
        x: sx - (sx - panRef.current.x) * (newZoom / oldZoom),
        y: sy - (sy - panRef.current.y) * (newZoom / oldZoom),
      };
      zoomRef.current = newZoom;
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  // ─── Interaction helpers ──────────────────────────────────

  const getNodeAt = useCallback(
    (wx: number, wy: number): CanvasNode | null => {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dx = n.x - wx;
        const dy = n.y - wy;
        const r = getNodeRadius(n);
        const hit = r + 6 / zoomRef.current;
        if (dx * dx + dy * dy <= hit * hit) return n;
      }
      return null;
    },
    [nodes]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      // Panning
      if (isPanningRef.current) {
        const dx = sx - panStartRef.current.x;
        const dy = sy - panStartRef.current.y;
        panDistRef.current += Math.sqrt(dx * dx + dy * dy);
        panRef.current = { x: panRef.current.x + dx, y: panRef.current.y + dy };
        panStartRef.current = { x: sx, y: sy };
        return;
      }

      const world = screenToWorld(sx, sy);

      // Dragging a node
      if (isDragging.current && dragNode.current) {
        const dragId = dragNode.current.id;
        setNodes((prev) =>
          prev.map((n) =>
            n.id === dragId ? { ...n, fx: world.x, fy: world.y, x: world.x, y: world.y } : n
          )
        );
        return;
      }

      const node = getNodeAt(world.x, world.y);
      setHoveredNode(node);
      storeHoverNode(node as GraphNode | null);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = node ? "pointer" : "grab";
      }
    },
    [getNodeAt, storeHoverNode, screenToWorld]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = screenToWorld(sx, sy);
      const node = getNodeAt(world.x, world.y);

      if (node) {
        isDragging.current = true;
        dragNode.current = node;
        setSelectedNode(node);
        storeSelectNode(node as GraphNode);
      } else {
        // Start panning
        isPanningRef.current = true;
        panStartRef.current = { x: sx, y: sy };
        panDistRef.current = 0;
        if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
      }
    },
    [getNodeAt, storeSelectNode, screenToWorld]
  );

  const handleMouseUp = useCallback(() => {
    // If it was a click (not a real pan), deselect
    if (isPanningRef.current && panDistRef.current < 3) {
      setSelectedNode(null);
      storeSelectNode(null);
    }
    // Dragged nodes stay pinned — do NOT clear fx/fy
    isDragging.current = false;
    dragNode.current = null;
    isPanningRef.current = false;
    if (canvasRef.current) canvasRef.current.style.cursor = "default";
  }, [storeSelectNode]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const node = getNodeAt(world.x, world.y);
      if (node && node.fx !== undefined) {
        setNodes((prev) =>
          prev.map((n) => (n.id === node.id ? { ...n, fx: undefined, fy: undefined } : n))
        );
      }
    },
    [getNodeAt, screenToWorld]
  );

  // ─── Zoom controls ───────────────────────────────────────

  const handleZoomIn = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.offsetWidth / 2;
    const cy = canvas.offsetHeight / 2;
    const old = zoomRef.current;
    const nz = Math.min(3, old * 1.3);
    panRef.current = {
      x: cx - (cx - panRef.current.x) * (nz / old),
      y: cy - (cy - panRef.current.y) * (nz / old),
    };
    zoomRef.current = nz;
  }, []);

  const handleZoomOut = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.offsetWidth / 2;
    const cy = canvas.offsetHeight / 2;
    const old = zoomRef.current;
    const nz = Math.max(0.15, old * 0.7);
    panRef.current = {
      x: cx - (cx - panRef.current.x) * (nz / old),
      y: cy - (cy - panRef.current.y) * (nz / old),
    };
    zoomRef.current = nz;
  }, []);

  const handleUnpinAll = useCallback(() => {
    setNodes((prev) => prev.map((n) => ({ ...n, fx: undefined, fy: undefined })));
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
        background: "#1A1411",
        backgroundImage: "radial-gradient(circle, rgba(61,48,40,0.35) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >


      {/* Selected node info panel */}
      {selectedNode && (
        <div
          className="absolute top-4 right-4 z-10 w-64 rounded-xl p-4 text-left space-y-3"
          style={{
            background: "rgba(28, 22, 18, 0.92)",
            border: `1px solid ${NODE_COLORS[selectedNode.category].border}`,
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="font-mono text-xs font-bold"
              style={{ color: NODE_COLORS[selectedNode.category].text }}
            >
              {selectedNode.name}
            </span>
            <button
              onClick={() => {
                setSelectedNode(null);
                storeSelectNode(null);
              }}
              className="text-[#6B5E56] hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] text-[#9A8F87] leading-relaxed">{selectedNode.description}</p>
          <div className="flex items-center gap-3 text-[11px] text-[#6B5E56]">
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
            <span className="text-[10px] text-[#9A8F87] capitalize">{type}</span>
          </div>
        ))}
        <div className="mt-1 pt-1.5 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {(["low", "medium", "high", "critical"] as const).map((risk) => (
            <div key={risk} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: RISK_COLORS[risk] }} />
              <span className="text-[9px] text-[#9A8F87] capitalize">{risk} risk</span>
            </div>
          ))}
        </div>
      </div>

      {/* Zoom & pin controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5 items-end">
        <div className="flex gap-1.5">
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-sm border transition-all hover:border-primary/50 hover:text-primary"
            style={{ background: "rgba(28,22,18,0.85)", borderColor: "rgba(255,255,255,0.1)", color: "#9A8F87", backdropFilter: "blur(8px)" }}
            title="Zoom out"
          >
            −
          </button>
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-sm border transition-all hover:border-primary/50 hover:text-primary"
            style={{ background: "rgba(28,22,18,0.85)", borderColor: "rgba(255,255,255,0.1)", color: "#9A8F87", backdropFilter: "blur(8px)" }}
            title="Zoom in"
          >
            +
          </button>
        </div>
        <button
          onClick={fitToScreen}
          className="px-3 h-8 flex items-center justify-center rounded-lg text-[11px] border transition-all hover:border-primary/50 hover:text-primary"
          style={{ background: "rgba(28,22,18,0.85)", borderColor: "rgba(255,255,255,0.1)", color: "#9A8F87", backdropFilter: "blur(8px)" }}
          title="Fit all nodes to screen"
        >
          Fit
        </button>
        <button
          onClick={handleUnpinAll}
          className="px-3 h-8 flex items-center justify-center rounded-lg text-[11px] border transition-all hover:border-primary/50 hover:text-primary"
          style={{ background: "rgba(28,22,18,0.85)", borderColor: "rgba(255,255,255,0.1)", color: "#9A8F87", backdropFilter: "blur(8px)" }}
          title="Unpin all nodes (double-click individual nodes to unpin)"
        >
          Unpin
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 w-full h-full"
        style={{ cursor: "grab" }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />

      {/* Hover tooltip */}
      {hoveredNode && !isDragging.current && (
        <div className="absolute bottom-16 right-4 z-10 flex flex-col items-end gap-0.5 pointer-events-none">
          <div
            className="px-2.5 py-1.5 rounded-lg text-xs"
            style={{
              background: "rgba(28,22,18,0.95)",
              border: `1px solid ${NODE_COLORS[hoveredNode.category].border}`,
            }}
          >
            <span style={{ color: NODE_COLORS[hoveredNode.category].text }} className="font-mono font-bold">
              {hoveredNode.name}
            </span>
            <span className="text-[#6B5E56] ml-2 text-[10px]">{hoveredNode.lines} lines</span>
          </div>
        </div>
      )}
    </div>
  );
}
