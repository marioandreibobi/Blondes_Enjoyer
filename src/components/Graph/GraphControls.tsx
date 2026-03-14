"use client";

import React from "react";
import { useGraphStore } from "@/store/graph-store";
import type { NodeType, Complexity } from "@/types";

const NODE_TYPES: NodeType[] = [
  "route", "controller", "service", "model",
  "middleware", "util", "config", "test", "entry",
];

const COMPLEXITY_OPTIONS: Array<"all" | Complexity> = [
  "all", "low", "medium", "high",
];

export default function GraphControls(): React.ReactElement {
  const typeFilters = useGraphStore((s) => s.typeFilters);
  const complexityFilter = useGraphStore((s) => s.complexityFilter);
  const toggleTypeFilter = useGraphStore((s) => s.toggleTypeFilter);
  const setComplexityFilter = useGraphStore((s) => s.setComplexityFilter);

  return (
    <div className="flex flex-col gap-3 p-3 rounded-xl bg-glass border-glass shadow-blueprint">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">
          Hide Types
        </p>
        <div className="flex flex-wrap gap-1">
          {NODE_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => toggleTypeFilter(type)}
              className={`px-2 py-0.5 text-xs rounded-full border transition-brand capitalize ${
                typeFilters.has(type)
                  ? "bg-muted/50 text-muted-foreground line-through border-transparent"
                  : "bg-secondary/50 text-foreground border-glass hover:border-primary/30"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">
          Complexity
        </p>
        <div className="flex gap-1">
          {COMPLEXITY_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setComplexityFilter(opt)}
              className={`px-2 py-0.5 text-xs rounded-full border transition-brand capitalize ${
                complexityFilter === opt
                  ? "bg-primary text-primary-foreground glow-primary border-primary/50"
                  : "bg-secondary/50 text-foreground border-glass hover:border-primary/30"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

