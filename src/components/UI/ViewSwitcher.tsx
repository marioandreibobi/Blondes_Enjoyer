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
const ACTIVE_STYLE = { background: "rgba(99,102,241,0.8)", color: "#fff", boxShadow: "0 0 12px rgba(99,102,241,0.3)" };
const INACTIVE_STYLE = { color: "rgba(255,255,255,0.4)" };
const EXPORT_STYLE = { background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.35)" };

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
          Blueprint
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
