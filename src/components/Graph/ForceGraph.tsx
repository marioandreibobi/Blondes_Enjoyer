"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { useGraphStore } from "@/store/graph-store";
import type { GraphNode } from "@/types";

const NODE_COLORS: Record<string, string> = {
  route: "#3b82f6",      // blue
  controller: "#8b5cf6", // violet
  service: "#10b981",    // emerald
  model: "#f59e0b",      // amber
  middleware: "#ef4444",  // red
  util: "#6b7280",       // gray
  config: "#64748b",     // slate
  test: "#06b6d4",       // cyan
  entry: "#f97316",      // orange
};

const COMPLEXITY_SIZE: Record<string, number> = {
  low: 4,
  medium: 7,
  high: 12,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ForceGraphInstance = any;

export default function ForceGraph(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphInstance>(null);
  const analysisResult = useGraphStore((s) => s.analysisResult);
  const selectNode = useGraphStore((s) => s.selectNode);
  const hoverNode = useGraphStore((s) => s.hoverNode);
  const typeFilters = useGraphStore((s) => s.typeFilters);
  const complexityFilter = useGraphStore((s) => s.complexityFilter);

  const getFilteredData = useCallback(() => {
    if (!analysisResult) return { nodes: [], links: [] };

    let nodes = analysisResult.graph.nodes;
    if (typeFilters.size > 0) {
      nodes = nodes.filter((n) => !typeFilters.has(n.type));
    }
    if (complexityFilter !== "all") {
      nodes = nodes.filter((n) => n.complexity === complexityFilter);
    }

    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = analysisResult.graph.links.filter(
      (l) => nodeIds.has(l.source) && nodeIds.has(l.target)
    );

    return { nodes, links };
  }, [analysisResult, typeFilters, complexityFilter]);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || !analysisResult) return;

    let destroyed = false;

    import("3d-force-graph").then((mod) => {
      if (destroyed || !containerRef.current) return;

      // Clear any stale content from previous mount (React StrictMode)
      containerRef.current.innerHTML = "";

      const ForceGraph3DFactory = mod.default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const graph = (ForceGraph3DFactory as any)()(containerRef.current);

      graph
        .width(containerRef.current.clientWidth)
        .height(containerRef.current.clientHeight)
        .nodeColor((node: object) => {
          const n = node as GraphNode;
          return NODE_COLORS[n.type] ?? "#6b7280";
        })
        .nodeVal((node: object) => {
          const n = node as GraphNode;
          return COMPLEXITY_SIZE[n.complexity] ?? 4;
        })
        .nodeLabel((node: object) => {
          const n = node as GraphNode;
          return `${n.id}\n${n.description || n.type}`;
        })
        .linkDirectionalArrowLength(3.5)
        .linkDirectionalArrowRelPos(1)
        .linkColor(() => "rgba(255,255,255,0.2)")
        .onNodeClick((node: object) => {
          selectNode(node as GraphNode);
        })
        .onNodeHover((node: object | null) => {
          hoverNode(node as GraphNode | null);
        })
        .backgroundColor("#030712");

      const data = getFilteredData();
      graph.graphData(data);

      graphRef.current = graph;
    }).catch((err) => {
      console.error("Failed to load 3d-force-graph:", err);
    });

    return () => {
      destroyed = true;
      // Delay cleanup to avoid StrictMode double-mount race condition
      const currentGraph = graphRef.current;
      if (currentGraph) {
        setTimeout(() => {
          currentGraph._destructor?.();
        }, 0);
        graphRef.current = null;
      }
    };
  }, [analysisResult]); // Re-init when analysis data arrives

  // Update graph data when filters or analysis result change
  useEffect(() => {
    if (!graphRef.current) return;
    const data = getFilteredData();
    graphRef.current.graphData(data);
  }, [getFilteredData]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[500px] bg-gray-950 rounded-lg overflow-hidden"
    />
  );
}

