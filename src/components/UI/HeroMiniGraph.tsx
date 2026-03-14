"use client";

import React, { useRef, useEffect, useState } from "react";

const SAMPLE_NODES = [
  { id: "app", type: "entry", x: 0, y: 0, z: 0 },
  { id: "router", type: "route", x: 30, y: 20, z: -10 },
  { id: "auth", type: "middleware", x: -20, y: -15, z: 25 },
  { id: "users", type: "service", x: 40, y: -30, z: 15 },
  { id: "db", type: "model", x: -35, y: 25, z: -20 },
  { id: "utils", type: "util", x: 15, y: 35, z: 30 },
  { id: "config", type: "config", x: -25, y: -35, z: -25 },
  { id: "test", type: "test", x: 45, y: 10, z: -30 },
  { id: "ctrl", type: "controller", x: -40, y: -5, z: 10 },
  { id: "api", type: "route", x: 20, y: -20, z: -35 },
];

const SAMPLE_LINKS = [
  { source: "app", target: "router" }, { source: "app", target: "auth" },
  { source: "router", target: "users" }, { source: "auth", target: "db" },
  { source: "users", target: "utils" }, { source: "db", target: "config" },
  { source: "router", target: "test" }, { source: "ctrl", target: "users" },
  { source: "api", target: "router" }, { source: "utils", target: "db" },
];

const NODE_COLORS: Record<string, string> = {
  entry: "#ff6b6b", route: "#ffa94d", controller: "#ffd43b",
  service: "#69db7c", middleware: "#748ffc", model: "#da77f2",
  util: "#868e96", config: "#495057", test: "#20c997",
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

    import("3d-force-graph").then((mod) => {
      if (destroyed || !containerRef.current) return;
      containerRef.current.innerHTML = "";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ForceGraph3D = (mod.default as any)();
      const graph = ForceGraph3D(containerRef.current);

      const nodes = SAMPLE_NODES.map((n) => ({ ...n }));
      const links = SAMPLE_LINKS.map((l) => ({ source: l.source, target: l.target }));

      graph
        .width(containerRef.current.clientWidth)
        .height(containerRef.current.clientHeight)
        .backgroundColor("rgba(0,0,0,0)")
        .nodeVal(3)
        .nodeColor((node: object) => {
          const n = node as (typeof SAMPLE_NODES)[0];
          return NODE_COLORS[n.type] ?? "#868e96";
        })
        .nodeOpacity(0.85)
        .linkColor(() => "rgba(56,120,200,0.15)")
        .linkWidth(0.4)
        .enableNodeDrag(false)
        .enableNavigationControls(false)
        .showNavInfo(false)
        .graphData({ nodes, links });

      // Auto-rotate
      let angle = 0;
      const dist = 120;
      function rotate(): void {
        if (destroyed) return;
        angle += 0.003;
        graph.cameraPosition({
          x: dist * Math.sin(angle),
          z: dist * Math.cos(angle),
        });
        requestAnimationFrame(rotate);
      }
      rotate();
    });

    return () => { destroyed = true; };
  }, [mounted]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[280px] rounded-xl overflow-hidden"
      style={{ background: "transparent" }}
    />
  );
}
