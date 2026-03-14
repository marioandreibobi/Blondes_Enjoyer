"use client";

import React from "react";
import { useGraphStore } from "@/store/graph-store";
import type { NodeType } from "@/types";

const LEGEND_ITEMS: Array<{ type: NodeType; color: string; label: string }> = [
  { type: "entry",      color: "#ff6b6b", label: "Entry point" },
  { type: "route",      color: "#ffa94d", label: "Route" },
  { type: "controller", color: "#ffd43b", label: "Controller" },
  { type: "service",    color: "#69db7c", label: "Service" },
  { type: "middleware",  color: "#748ffc", label: "Middleware" },
  { type: "model",      color: "#da77f2", label: "Model" },
  { type: "util",       color: "#868e96", label: "Utility" },
  { type: "config",     color: "#495057", label: "Config" },
  { type: "test",       color: "#20c997", label: "Test" },
];

export default function Legend(): React.ReactElement {
  const toggleTypeFilter = useGraphStore((s) => s.toggleTypeFilter);
  const typeFilters = useGraphStore((s) => s.typeFilters);

  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-glass border-glass shadow-blueprint">
      {LEGEND_ITEMS.map((item) => (
        <div
          key={item.type}
          onClick={() => toggleTypeFilter(item.type)}
          className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-md border border-transparent transition-brand hover:border-primary/20 hover:bg-white/5"
          style={{
            opacity: typeFilters.has(item.type) ? 0.35 : 1,
          }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}40` }}
          />
          <span className="text-[11px] text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

