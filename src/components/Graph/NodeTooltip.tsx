"use client";

import React from "react";
import { useGraphStore } from "@/store/graph-store";

export default function NodeTooltip(): React.ReactElement | null {
  const hoveredNode = useGraphStore((s) => s.hoveredNode);

  if (!hoveredNode) return null;

  return (
    <div className="fixed top-4 left-4 z-50 max-w-xs rounded-lg bg-card border border-border p-3 shadow-lg pointer-events-none">
      <p className="text-sm font-mono font-semibold text-foreground truncate">
        {hoveredNode.id}
      </p>
      <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
        <span className="capitalize">{hoveredNode.type}</span>
        <span>&bull;</span>
        <span>{hoveredNode.lines} lines</span>
        <span>&bull;</span>
        <span className="capitalize">{hoveredNode.complexity}</span>
      </div>
      {hoveredNode.description && (
        <p className="mt-1 text-xs text-muted-foreground">
          {hoveredNode.description}
        </p>
      )}
      {hoveredNode.risk && (
        <p className="mt-1 text-xs text-destructive">Warning: {hoveredNode.risk}</p>
      )}
    </div>
  );
}

