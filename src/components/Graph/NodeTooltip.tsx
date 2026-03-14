"use client";

import React from "react";
import { motion } from "framer-motion";
import { useGraphStore } from "@/store/graph-store";
import { NODE_TYPES } from "@/components/Graph/ForceGraph";

export default function NodeTooltip(): React.ReactElement | null {
  const hoveredNode = useGraphStore((s) => s.hoveredNode);

  if (!hoveredNode) return null;

  const typeInfo = NODE_TYPES[hoveredNode.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed top-4 left-4 z-50 max-w-xs rounded-xl p-4 pointer-events-none bg-glass border-glass shadow-blueprint"
    >
      <p className="text-sm font-mono font-semibold text-foreground truncate">
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
        <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-secondary/50 text-muted-foreground">
          {hoveredNode.lines} lines
        </span>
        <span className="inline-block px-2 py-0.5 rounded text-[11px] capitalize bg-secondary/50 text-muted-foreground">
          {hoveredNode.complexity}
        </span>
      </div>
      {hoveredNode.description && (
        <p className="mt-2 text-xs text-muted-foreground">
          {hoveredNode.description}
        </p>
      )}
      {hoveredNode.risk && (
        <div className="mt-2 inline-block px-2.5 py-1 rounded-md text-[11px] bg-accent/20 text-accent">
          ⚠ {hoveredNode.risk}
        </div>
      )}
    </motion.div>
  );
}

