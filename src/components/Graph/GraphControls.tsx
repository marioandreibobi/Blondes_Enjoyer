"use client";

import React, { useState } from "react";
import { MousePointerClick, ChevronDown, SlidersHorizontal } from "lucide-react";
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
  const setTypeFilters = useGraphStore((s) => s.setTypeFilters);
  const setComplexityFilter = useGraphStore((s) => s.setComplexityFilter);

  const [typesOpen, setTypesOpen] = useState(true);
  const [complexityOpen, setComplexityOpen] = useState(true);

  const allSelected = typeFilters.size === 0;

  const handleToggleAll = (): void => {
    if (allSelected) {
      setTypeFilters(new Set(NODE_TYPES));
    } else {
      setTypeFilters(new Set());
    }
  };

  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl bg-glass border-glass shadow-blueprint">
      {/* Types section */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={handleToggleAll}
            className="group flex items-center gap-1.5 text-xs font-medium text-muted-foreground rounded px-1.5 py-0.5 -ml-1.5 transition-brand hover:text-foreground hover:bg-white/5"
          >
            <MousePointerClick className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-brand" />
            <span>Types</span>
          </button>
          <button
            onClick={() => setTypesOpen((v) => !v)}
            className="text-muted-foreground hover:text-foreground transition-brand p-0.5 rounded hover:bg-white/5"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${typesOpen ? "" : "-rotate-90"}`} />
          </button>
        </div>
        {typesOpen && (
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
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-glass my-1" />

      {/* Complexity section */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-1.5 py-0.5 -ml-1.5">
            <SlidersHorizontal className="h-3 w-3 opacity-60" />
            <span>Complexity</span>
          </div>
          <button
            onClick={() => setComplexityOpen((v) => !v)}
            className="text-muted-foreground hover:text-foreground transition-brand p-0.5 rounded hover:bg-white/5"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${complexityOpen ? "" : "-rotate-90"}`} />
          </button>
        </div>
        {complexityOpen && (
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
        )}
      </div>
    </div>
  );
}

