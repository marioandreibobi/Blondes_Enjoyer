"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { useGraphStore } from "@/store/graph-store";
import type { GraphNode, NodeType } from "@/types";

export const NODE_TYPES: Record<string, { color: string; label: string }> = {
  entry:      { color: "#ff6b6b", label: "Entry point" },
  route:      { color: "#ffa94d", label: "Route" },
  controller: { color: "#ffd43b", label: "Controller" },
  service:    { color: "#69db7c", label: "Service" },
  middleware: { color: "#748ffc", label: "Middleware" },
  model:      { color: "#da77f2", label: "Model" },
  util:       { color: "#868e96", label: "Utility" },
  config:     { color: "#495057", label: "Config" },
  test:       { color: "#20c997", label: "Test" },
};

// Category-based colors (matching Legend & DiagramView)
const CATEGORY_COLOR_MAP: Record<string, string> = {
  entry: "#22c55e",
  route: "#22c55e",
  controller: "#22c55e",
  service: "#a855f7",
  model: "#a855f7",
  middleware: "#f59e0b",
  util: "#06b6d4",
  test: "#ec4899",
  config: "#3b82f6",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ForceGraphInstance = any;

function getNodeColor(n: GraphNode): string {
  return CATEGORY_COLOR_MAP[n.type] ?? "#64748b";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function ForceGraph(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphInstance>(null);
  const analysisResult = useGraphStore((s) => s.analysisResult);
  const selectNode = useGraphStore((s) => s.selectNode);
  const hoverNode = useGraphStore((s) => s.hoverNode);
  const typeFilters = useGraphStore((s) => s.typeFilters);
  const complexityFilter = useGraphStore((s) => s.complexityFilter);
  const activeCategory = useGraphStore((s) => s.activeCategory);

  const getFilteredData = useCallback(() => {
    if (!analysisResult) return { nodes: [], links: [] };

    let nodes = analysisResult.graph.nodes;
    if (typeFilters.size > 0) {
      nodes = nodes.filter((n) => !typeFilters.has(n.type));
    }
    if (complexityFilter !== "all") {
      nodes = nodes.filter((n) => n.complexity === complexityFilter);
    }

    // Category filter (same logic as DiagramView)
    if (activeCategory && activeCategory !== "all") {
      const CATEGORY_TYPE_MAP: Record<string, NodeType[]> = {
        core: ["entry", "route", "controller"],
        services: ["service", "model"],
        utilities: ["util"],
        middleware: ["middleware"],
        testing: ["test"],
        config: ["config"],
      };
      const allowedTypes = CATEGORY_TYPE_MAP[activeCategory];
      if (allowedTypes) {
        nodes = nodes.filter((n) => allowedTypes.includes(n.type));
      }
    }

    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = analysisResult.graph.links.filter(
      (l) => nodeIds.has(l.source) && nodeIds.has(l.target)
    );

    return { nodes, links };
  }, [analysisResult, typeFilters, complexityFilter, activeCategory]);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || !analysisResult) return;

    let destroyed = false;

    import("3d-force-graph").then(async (mod) => {
      if (destroyed || !containerRef.current) return;

      const THREE = await import("three");

      // Clear any stale content from previous mount (React StrictMode)
      containerRef.current.innerHTML = "";

      const ForceGraph3DFactory = mod.default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const graph = (ForceGraph3DFactory as any)()(containerRef.current);

      graph
        .width(containerRef.current.clientWidth)
        .height(containerRef.current.clientHeight)
        .backgroundColor("#0a0a1a")
        .nodeVal((node: object) => {
          const n = node as GraphNode;
          return Math.max(2, Math.sqrt(n.importedBy + 1) * 3);
        })
        .nodeColor((node: object) => getNodeColor(node as GraphNode))
        .nodeOpacity(0.9)
        .nodeLabel((node: object) => {
          const n = node as GraphNode;
          return `${escapeHtml(n.id)} (${escapeHtml(NODE_TYPES[n.type]?.label ?? n.type)})`;
        })
        .nodeThreeObjectExtend(true)
        .nodeThreeObject((node: object) => {
          const n = node as GraphNode;
          const fileName = n.id.split("/").pop() ?? n.id;

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) return null;
          canvas.width = 256;
          canvas.height = 64;
          ctx.clearRect(0, 0, 256, 64);
          ctx.font = "bold 22px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = getNodeColor(n);
          ctx.globalAlpha = 0.85;
          const label = fileName.length > 20 ? fileName.slice(0, 18) + "…" : fileName;
          ctx.fillText(label, 128, 32);

          const texture = new THREE.CanvasTexture(canvas);
          const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
          );
          sprite.scale.set(24, 6, 1);
          sprite.position.set(0, 6, 0);
          return sprite;
        })
        .linkColor(() => "rgba(255,255,255,0.12)")
        .linkWidth(0.4)
        .linkDirectionalParticles(1)
        .linkDirectionalParticleWidth(0.6)
        .linkDirectionalParticleSpeed(0.006)
        .linkDirectionalParticleColor(() => "rgba(255,255,255,0.2)")
        .onNodeClick((node: object) => {
          const n = node as GraphNode;
          selectNode(n);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = graph.graphData() as { links: any[] };
          const connected = new Set<string>([n.id]);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.links.forEach((l: any) => {
            const sid = typeof l.source === "object" ? l.source.id : l.source;
            const tid = typeof l.target === "object" ? l.target.id : l.target;
            if (sid === n.id) connected.add(tid);
            if (tid === n.id) connected.add(sid);
          });

          graph.nodeColor((nd: object) => {
            const nd2 = nd as GraphNode;
            return connected.has(nd2.id) ? getNodeColor(nd2) : "rgba(60,60,80,0.2)";
          });
          graph.linkColor((l: object) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const lk = l as any;
            const sid = typeof lk.source === "object" ? lk.source.id : lk.source;
            const tid = typeof lk.target === "object" ? lk.target.id : lk.target;
            return sid === n.id || tid === n.id
              ? "rgba(255,255,255,0.35)"
              : "rgba(255,255,255,0.02)";
          });
        })
        .onNodeHover((node: object | null) => {
          hoverNode(node as GraphNode | null);
        })
        .onBackgroundClick(() => {
          selectNode(null);
          graph.nodeColor((nd: object) => getNodeColor(nd as GraphNode));
          graph.linkColor(() => "rgba(255,255,255,0.12)");
        });

      // Force configuration
      graph.d3Force("charge").strength(-120);
      graph.d3Force("link").distance(40);

      const data = getFilteredData();
      graph.graphData(data);

      graphRef.current = graph;
    }).catch((err) => {
      console.error("Failed to load 3d-force-graph:", err);
    });

    return () => {
      destroyed = true;
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
      className="w-full h-full min-h-[500px] rounded-lg overflow-hidden"
      style={{ background: "#0a0a1a" }}
    />
  );
}

