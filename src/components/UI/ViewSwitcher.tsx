"use client";

import React from "react";
import { Box, Network, Download } from "lucide-react";

type ViewMode = "3d" | "diagram";

interface ViewSwitcherProps {
  value: ViewMode;
  onSwitch: (view: ViewMode) => void;
  onExport?: () => void;
}

const BTN_BASE = "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all";
const ACTIVE_STYLE = { background: "rgba(224,123,84,0.85)", color: "#fff", boxShadow: "0 0 12px rgba(224,123,84,0.3)" };
const INACTIVE_STYLE = { color: "rgba(255,255,255,0.4)" };
const EXPORT_STYLE = { background: "rgba(107,175,124,0.15)", color: "#6BAF7C", border: "1px solid rgba(107,175,124,0.35)" };

export default function ViewSwitcher({ value, onSwitch, onExport }: ViewSwitcherProps): React.ReactElement {
  return (
    <div className="inline-flex items-center gap-2">
      <div
        className="inline-flex rounded-lg p-1 gap-1"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={() => onSwitch("diagram")}
          className={BTN_BASE}
          style={value === "diagram" ? ACTIVE_STYLE : INACTIVE_STYLE}
        >
          <Network className="h-3.5 w-3.5" />
          City Map
        </button>
        <button
          onClick={() => onSwitch("3d")}
          className={BTN_BASE}
          style={value === "3d" ? ACTIVE_STYLE : INACTIVE_STYLE}
        >
          <Box className="h-3.5 w-3.5" />
          Force Graph
        </button>
      </div>
      {onExport && (
        <button
          onClick={onExport}
          className={`${BTN_BASE} rounded-lg`}
          style={EXPORT_STYLE}
        >
          <Download className="h-3.5 w-3.5" />
          Export Report
        </button>
      )}
    </div>
  );
}
