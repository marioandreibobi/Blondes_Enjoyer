"use client";

import React from "react";
import { useGraphStore } from "@/store/graph-store";
import { NODE_TYPES } from "@/components/Graph/ForceGraph";

export default function NodeTooltip(): React.ReactElement | null {
  const hoveredNode = useGraphStore((s) => s.hoveredNode);

  if (!hoveredNode) return null;

  const typeInfo = NODE_TYPES[hoveredNode.type];

  return (
    <div
      className="fixed top-4 left-4 z-50 max-w-xs rounded-xl p-4 pointer-events-none shadow-lg"
      style={{
        background: "rgba(15,15,35,0.92)",
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(12px)",
        fontSize: "13px",
      }}
    >
      <p className="text-sm font-mono font-semibold text-white truncate">
        {hoveredNode.id}
      </p>
      <div className="mt-2 flex gap-1.5 flex-wrap">
        {typeInfo && (
          <span
            className="inline-block px-2 py-0.5 rounded text-[11px]"
            style={{
              background: `${typeInfo.color}22`,
              color: typeInfo.color,
            }}
          >
            {typeInfo.label}
          </span>
        )}
        <span
          className="inline-block px-2 py-0.5 rounded text-[11px]"
          style={{ background: "rgba(255,255,255,0.05)", color: "#aaa" }}
        >
          {hoveredNode.lines} lines
        </span>
        <span
          className="inline-block px-2 py-0.5 rounded text-[11px] capitalize"
          style={{ background: "rgba(255,255,255,0.05)", color: "#aaa" }}
        >
          {hoveredNode.complexity}
        </span>
      </div>
      {hoveredNode.description && (
        <p className="mt-2 text-xs" style={{ color: "#aaa" }}>
          {hoveredNode.description}
        </p>
      )}
      {hoveredNode.risk && (
        <div
          className="mt-2 inline-block px-2.5 py-1 rounded-md text-[11px]"
          style={{ background: "rgba(255,80,80,0.2)", color: "#ff6b6b" }}
        >
          ⚠ {hoveredNode.risk}
        </div>
      )}
    </div>
  );
}

