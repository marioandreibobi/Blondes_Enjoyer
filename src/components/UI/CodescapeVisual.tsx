"use client";

import React from "react";
import { motion } from "framer-motion";

const NODES = [
  { id: "A", cx: 120, cy: 80, r: 8, color: "#ff6b6b", label: "entry" },
  { id: "B", cx: 220, cy: 50, r: 6, color: "#ffa94d", label: "route" },
  { id: "C", cx: 300, cy: 120, r: 7, color: "#69db7c", label: "service" },
  { id: "D", cx: 180, cy: 160, r: 5, color: "#748ffc", label: "middleware" },
  { id: "E", cx: 80, cy: 180, r: 6, color: "#da77f2", label: "model" },
  { id: "F", cx: 350, cy: 60, r: 5, color: "#868e96", label: "util" },
  { id: "G", cx: 260, cy: 200, r: 7, color: "#20c997", label: "test" },
  { id: "H", cx: 400, cy: 160, r: 5, color: "#ffd43b", label: "controller" },
];

const EDGES = [
  { from: "A", to: "B" }, { from: "A", to: "D" }, { from: "B", to: "C" },
  { from: "B", to: "F" }, { from: "C", to: "D" }, { from: "D", to: "E" },
  { from: "C", to: "G" }, { from: "C", to: "H" }, { from: "F", to: "H" },
];

const RISK_DOTS = [
  { cx: 300, cy: 120, delay: 1 },
  { cx: 260, cy: 200, delay: 2.5 },
];

const METRICS = [
  { x: 60, y: 40, text: "12 imports" },
  { x: 340, y: 220, text: "high risk" },
];

function getNode(id: string): { cx: number; cy: number } {
  return NODES.find((n) => n.id === id) ?? { cx: 0, cy: 0 };
}

export default function CodescapeVisual(): React.ReactElement {
  return (
    <svg viewBox="0 0 480 260" className="w-full h-auto" aria-hidden="true">
      {/* Edges */}
      {EDGES.map((e, i) => {
        const from = getNode(e.from);
        const to = getNode(e.to);
        return (
          <motion.line
            key={i}
            x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy}
            stroke="rgba(56,120,200,0.2)"
            strokeWidth={1}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.3 + i * 0.08 }}
          />
        );
      })}

      {/* Nodes */}
      {NODES.map((n, i) => (
        <motion.circle
          key={n.id}
          cx={n.cx} cy={n.cy} r={n.r}
          fill={n.color}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.85 }}
          transition={{ duration: 0.5, delay: 0.1 + i * 0.1, type: "spring" }}
        />
      ))}

      {/* Risk pulse dots */}
      {RISK_DOTS.map((d, i) => (
        <motion.circle
          key={`risk-${i}`}
          cx={d.cx} cy={d.cy} r={14}
          fill="none"
          stroke="hsl(10 70% 55%)"
          strokeWidth={1.5}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: [0.5, 1.4, 0.5], opacity: [0, 0.6, 0] }}
          transition={{ duration: 3, delay: d.delay, repeat: Infinity }}
        />
      ))}

      {/* Metric labels */}
      {METRICS.map((m, i) => (
        <motion.text
          key={`metric-${i}`}
          x={m.x} y={m.y}
          fill="hsl(225 15% 55%)"
          fontSize={10}
          fontFamily="JetBrains Mono, monospace"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 1, delay: 1.5 + i * 0.5 }}
        >
          {m.text}
        </motion.text>
      ))}
    </svg>
  );
}
