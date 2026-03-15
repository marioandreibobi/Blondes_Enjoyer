"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";

// ─── Sample data matching actual ForceGraph categories ────────

type Category = "core" | "services" | "utilities" | "qa" | "configuration";

interface MiniNode {
  id: string;
  label: string;
  category: Category;
  risk: "low" | "medium" | "high";
  complexity: number; // 0–100
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface MiniEdge {
  source: string;
  target: string;
}

const CATEGORY_COLORS: Record<Category, { dot: string; text: string }> = {
  core:          { dot: "#3b82f6", text: "#60a5fa" },
  services:      { dot: "#22c55e", text: "#4ade80" },
  utilities:     { dot: "#facc15", text: "#fde047" },
  qa:            { dot: "#ec4899", text: "#f472b6" },
  configuration: { dot: "#f97316", text: "#fb923c" },
};

const RISK_COLORS: Record<string, string> = { low: "#22c55e", medium: "#fbbf24", high: "#ef4444" };

const CATEGORY_ANCHORS: Record<Category, { x: number; y: number }> = {
  core:          { x: 0,    y: 0    },
  services:      { x: 180,  y: -60  },
  utilities:     { x: -180, y: 30   },
  qa:            { x: 80,   y: 170  },
  configuration: { x: -100, y: 150  },
};

const INITIAL_NODES: Omit<MiniNode, "x" | "y" | "vx" | "vy">[] = [
  { id: "app.ts",        label: "app",      category: "core",          risk: "low",    complexity: 40 },
  { id: "router.ts",     label: "router",   category: "core",          risk: "medium", complexity: 65 },
  { id: "auth.ts",       label: "auth",     category: "core",          risk: "high",   complexity: 80 },
  { id: "users.ts",      label: "users",    category: "services",      risk: "medium", complexity: 55 },
  { id: "db.ts",         label: "db",       category: "services",      risk: "low",    complexity: 30 },
  { id: "utils.ts",      label: "utils",    category: "utilities",     risk: "low",    complexity: 20 },
  { id: "helpers.ts",    label: "helpers",  category: "utilities",     risk: "low",    complexity: 25 },
  { id: "config.ts",     label: "config",   category: "configuration", risk: "low",    complexity: 15 },
  { id: "test.spec.ts",  label: "test",     category: "qa",            risk: "low",    complexity: 35 },
  { id: "e2e.spec.ts",   label: "e2e",      category: "qa",            risk: "medium", complexity: 50 },
  { id: "ctrl.ts",       label: "ctrl",     category: "core",          risk: "high",   complexity: 90 },
  { id: "api.ts",        label: "api",      category: "core",          risk: "medium", complexity: 70 },
];

const INITIAL_EDGES: MiniEdge[] = [
  { source: "app.ts", target: "router.ts" },  { source: "app.ts", target: "auth.ts" },
  { source: "router.ts", target: "users.ts" },{ source: "auth.ts", target: "db.ts" },
  { source: "users.ts", target: "utils.ts" }, { source: "db.ts", target: "config.ts" },
  { source: "router.ts", target: "test.spec.ts" }, { source: "ctrl.ts", target: "users.ts" },
  { source: "api.ts", target: "router.ts" },  { source: "utils.ts", target: "db.ts" },
  { source: "helpers.ts", target: "utils.ts" }, { source: "e2e.spec.ts", target: "app.ts" },
];

function initNodes(): MiniNode[] {
  return INITIAL_NODES.map((n, i) => {
    const anchor = CATEGORY_ANCHORS[n.category];
    const angle = (i / INITIAL_NODES.length) * Math.PI * 2 + Math.random() * 0.5;
    const r = 40 + Math.random() * 40;
    return {
      ...n,
      x: anchor.x + Math.cos(angle) * r,
      y: anchor.y + Math.sin(angle) * r,
      vx: 0,
      vy: 0,
    };
  });
}

export default function HeroMiniGraph(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<MiniNode[]>(initNodes());
  const animRef = useRef<number>(0);
  const [, forceRender] = useState(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Camera: center on origin, zoom to fit
    const zoom = Math.min(w, h) / 500;
    const panX = w / 2;
    const panY = h / 2;

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    const nodes = nodesRef.current;

    // Draw edges — dashed like actual ForceGraph
    ctx.setLineDash([4, 8]);
    for (const edge of INITIAL_EDGES) {
      const src = nodes.find((n) => n.id === edge.source);
      const tgt = nodes.find((n) => n.id === edge.target);
      if (!src || !tgt) continue;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.1)";
      ctx.lineWidth = 0.8;
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw nodes — matching actual ForceGraph style
    for (const node of nodes) {
      const colors = CATEGORY_COLORS[node.category];
      const radius = Math.max(5, Math.min(12, 4 + node.complexity / 14));
      const riskColor = RISK_COLORS[node.risk];

      // Glow
      const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 2.5);
      grd.addColorStop(0, colors.dot + "30");
      grd.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.fillStyle = grd;
      ctx.arc(node.x, node.y, radius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = colors.dot + "cc";
      ctx.fill();

      // Risk indicator dot
      ctx.beginPath();
      ctx.arc(node.x + radius * 0.6, node.y - radius * 0.5, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = riskColor;
      ctx.fill();

      // Label
      if (radius > 6) {
        ctx.font = "bold 9px monospace";
        ctx.fillStyle = colors.text + "bb";
        ctx.textAlign = "center";
        ctx.fillText(node.label, node.x, node.y + radius + 12);
      }
    }

    ctx.restore();
  }, []);

  // Physics simulation
  useEffect(() => {
    let tick = 0;
    const simulate = (): void => {
      tick++;
      const nodes = nodesRef.current;

      // Gentle center gravity
      for (const n of nodes) {
        n.vx += (0 - n.x) * 0.0002;
        n.vy += (0 - n.y) * 0.0002;
      }

      // Category clustering
      for (const n of nodes) {
        const anchor = CATEGORY_ANCHORS[n.category];
        n.vx += (anchor.x - n.x) * 0.004;
        n.vy += (anchor.y - n.y) * 0.004;
      }

      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const rep = (3000 / (dist * dist)) * 0.01;
          nodes[i].vx -= (dx / dist) * rep;
          nodes[i].vy -= (dy / dist) * rep;
          nodes[j].vx += (dx / dist) * rep;
          nodes[j].vy += (dy / dist) * rep;
        }
      }

      // Edge attraction
      for (const edge of INITIAL_EDGES) {
        const src = nodes.find((n) => n.id === edge.source);
        const tgt = nodes.find((n) => n.id === edge.target);
        if (!src || !tgt) continue;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const force = ((dist - 80) / dist) * 0.02;
        src.vx += dx * force;
        src.vy += dy * force;
        tgt.vx -= dx * force;
        tgt.vy -= dy * force;
      }

      // Damping
      for (const n of nodes) {
        n.vx *= 0.88;
        n.vy *= 0.88;
        n.x += n.vx;
        n.y += n.vy;
      }

      draw();

      // Slow down after settling
      if (tick < 200) {
        animRef.current = requestAnimationFrame(simulate);
      } else {
        // Continue at low framerate for subtle drift
        setTimeout(() => {
          animRef.current = requestAnimationFrame(simulate);
        }, 100);
      }
    };

    animRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // Handle resize
  useEffect(() => {
    const onResize = (): void => { forceRender((n) => n + 1); draw(); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full min-h-[320px] rounded-xl"
      style={{ background: "transparent" }}
    />
  );
}
