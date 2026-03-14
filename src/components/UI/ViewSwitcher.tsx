"use client";

import React, { useState } from "react";
import { Box, Network } from "lucide-react";

interface ViewSwitcherProps {
  onSwitch?: (view: "3d" | "svg") => void;
}

export default function ViewSwitcher({ onSwitch }: ViewSwitcherProps): React.ReactElement {
  const [active, setActive] = useState<"3d" | "svg">("3d");

  function handleSwitch(view: "3d" | "svg"): void {
    setActive(view);
    onSwitch?.(view);
  }

  return (
    <div className="inline-flex rounded-lg bg-glass border-glass p-1 gap-1">
      <button
        onClick={() => handleSwitch("3d")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-brand ${
          active === "3d"
            ? "bg-primary text-primary-foreground glow-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Box className="h-3.5 w-3.5" />
        3D View
      </button>
      <button
        onClick={() => handleSwitch("svg")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-brand ${
          active === "svg"
            ? "bg-primary text-primary-foreground glow-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Network className="h-3.5 w-3.5" />
        SVG View
      </button>
    </div>
  );
}
