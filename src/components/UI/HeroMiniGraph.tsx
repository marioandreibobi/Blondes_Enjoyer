"use client";

import React, { useRef, useEffect, useState } from "react";

type HeroNode = { id: string; type: string; x?: number; y?: number };
type HeroLink = { source: string; target: string };

interface HeroMiniGraphInstance {
  width: (value: number) => HeroMiniGraphInstance;
  height: (value: number) => HeroMiniGraphInstance;
  backgroundColor: (value: string) => HeroMiniGraphInstance;
  graphData: (value: { nodes: HeroNode[]; links: HeroLink[] }) => HeroMiniGraphInstance;
  nodeColor: (fn: (node: HeroNode) => string) => HeroMiniGraphInstance;
  nodeVal: (fn: (node: HeroNode) => number) => HeroMiniGraphInstance;
  nodeCanvasObject: (fn: (node: HeroNode, ctx: CanvasRenderingContext2D) => void) => HeroMiniGraphInstance;
  linkColor: (fn: () => string) => HeroMiniGraphInstance;
  linkWidth: (value: number) => HeroMiniGraphInstance;
  enableNodeDrag: (value: boolean) => HeroMiniGraphInstance;
  zoom: (value: number, durationMs?: number) => HeroMiniGraphInstance;
  _destructor?: () => void;
}

const SAMPLE_NODES = [
  { id: "app", type: "entry" },
  { id: "router", type: "route" },
  { id: "auth", type: "middleware" },
  { id: "users", type: "service" },
  { id: "db", type: "model" },
  { id: "utils", type: "util" },
  { id: "config", type: "config" },
  { id: "test", type: "test" },
  { id: "ctrl", type: "controller" },
  { id: "api", type: "route" },
];

const SAMPLE_LINKS = [
  { source: "app", target: "router" }, { source: "app", target: "auth" },
  { source: "router", target: "users" }, { source: "auth", target: "db" },
  { source: "users", target: "utils" }, { source: "db", target: "config" },
  { source: "router", target: "test" }, { source: "ctrl", target: "users" },
  { source: "api", target: "router" }, { source: "utils", target: "db" },
];

const NODE_COLORS: Record<string, string> = {
  entry: "#E07B54", route: "#D4A857", controller: "#D4A857",
  service: "#6BAF7C", middleware: "#9C7FCB", model: "#C96E45",
  util: "#6B5E56", config: "#6B5E56", test: "#6BAF7C",
};

export default function HeroMiniGraph(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current || typeof window === "undefined") return;

    let destroyed = false;
    let graphInstance: HeroMiniGraphInstance | null = null;
    let resizeHandler: (() => void) | null = null;

    import("force-graph").then((mod) => {
      if (destroyed || !containerRef.current) return;
      const ForceGraphFactory = mod.default;

      const graph = (
        ForceGraphFactory as unknown as () => (element: HTMLElement) => HeroMiniGraphInstance
      )()(containerRef.current);

      const resize = () => {
        if (!containerRef.current) return;
        graph.width(containerRef.current.clientWidth);
        graph.height(containerRef.current.clientHeight);
      };

      resize();

      graph
        .backgroundColor("rgba(0,0,0,0)")
        .nodeVal((node) => (node.type === "entry" ? 6 : 4))
        .nodeColor((node) => NODE_COLORS[node.type] ?? "#868e96")
        .nodeCanvasObject((node, ctx) => {
          const label = node.id;
          ctx.fillStyle = "rgba(242,237,232,0.85)";
          ctx.font = "8px monospace";
          ctx.fillText(label, (node.x ?? 0) + 6, (node.y ?? 0) - 6);
        })
        .linkColor(() => "rgba(61,48,40,0.45)")
        .linkWidth(0.8)
        .enableNodeDrag(false)
        .graphData({
          nodes: SAMPLE_NODES.map((n) => ({ ...n })),
          links: SAMPLE_LINKS.map((l) => ({ source: l.source, target: l.target })),
        });

      graph.zoom(2.3, 0);

      window.addEventListener("resize", resize);
      resizeHandler = resize;
      graphInstance = graph;
    });

    return () => {
      destroyed = true;
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      graphInstance?._destructor?.();
    };
  }, [mounted]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[280px] rounded-xl overflow-hidden"
      style={{ background: "transparent" }}
    />
  );
}
