"use client";

import React from "react";
import { motion } from "framer-motion";
import { Hexagon } from "lucide-react";

export default function LoadingState(): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center gap-6 p-12"
    >
      <div className="relative h-20 w-20">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full animate-pulse-glow" style={{ boxShadow: "0 0 30px hsl(225 80% 60% / 0.3)" }} />
        {/* Spinning hexagon */}
        <div className="absolute inset-0 flex items-center justify-center animate-hex-spin">
          <Hexagon className="h-12 w-12 text-primary" strokeWidth={1.5} />
        </div>
        {/* Inner icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Hexagon className="h-6 w-6 text-primary/50" strokeWidth={2} />
        </div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-foreground">
          Mapping your architecture...
        </p>
        <p className="text-sm text-muted-foreground font-mono">
          Fetching &bull; Parsing &bull; Analyzing
        </p>
      </div>
    </motion.div>
  );
}

