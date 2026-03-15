"use client";

import React from "react";
import { Box, Network } from "lucide-react";

type ViewMode = "3d" | "diagram";

interface ViewSwitcherProps {
  value: ViewMode;
  onSwitch: (view: ViewMode) => void;
}

export default function ViewSwitcher({ value, onSwitch }: ViewSwitcherProps): React.ReactElement {
  return (
    <div
      className="inline-flex rounded-lg p-1 gap-1"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <button
        onClick={() => onSwitch("3d")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all"
        style={
          value === "3d"
            ? { background: "rgba(99,102,241,0.8)", color: "#fff", boxShadow: "0 0 12px rgba(99,102,241,0.3)" }
            : { color: "rgba(255,255,255,0.4)" }
        }
      >
        <Box className="h-3.5 w-3.5" />
        3D View
      </button>
      <button
        onClick={() => onSwitch("diagram")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all"
        style={
          value === "diagram"
            ? { background: "rgba(99,102,241,0.8)", color: "#fff", boxShadow: "0 0 12px rgba(99,102,241,0.3)" }
            : { color: "rgba(255,255,255,0.4)" }
        }
      >
        <Network className="h-3.5 w-3.5" />
        City Map
      </button>
    </div>
  );
}
