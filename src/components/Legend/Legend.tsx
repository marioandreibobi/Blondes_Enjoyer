"use client";

import React from "react";

const LEGEND_ITEMS = [
  { type: "route", color: "#3b82f6", label: "Route / API" },
  { type: "controller", color: "#8b5cf6", label: "Controller" },
  { type: "service", color: "#10b981", label: "Service / Lib" },
  { type: "model", color: "#f59e0b", label: "Model / Schema" },
  { type: "middleware", color: "#ef4444", label: "Middleware" },
  { type: "util", color: "#6b7280", label: "Utility" },
  { type: "config", color: "#64748b", label: "Config" },
  { type: "test", color: "#06b6d4", label: "Test" },
  { type: "entry", color: "#f97316", label: "Entry Point" },
];

export default function Legend(): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-3 p-3 rounded-lg bg-card border border-border">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.type} className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-full inline-block"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-3 ml-4 border-l border-border pl-4">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
          <span className="text-xs text-muted-foreground">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />
          <span className="text-xs text-muted-foreground">Med</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-gray-400 inline-block" />
          <span className="text-xs text-muted-foreground">High</span>
        </div>
      </div>
    </div>
  );
}

