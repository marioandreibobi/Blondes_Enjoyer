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
        <div className="absolute inset-0 rounded-full animate-pulse-glow" style={{ boxShadow: "0 0 30px rgba(99,102,241,0.3)" }} />
        <div className="absolute inset-0 flex items-center justify-center animate-hex-spin">
          <Hexagon className="h-12 w-12" strokeWidth={1.5} style={{ color: "#6366f1" }} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Hexagon className="h-6 w-6" strokeWidth={2} style={{ color: "rgba(99,102,241,0.5)" }} />
        </div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold" style={{ color: "#e2e8f0" }}>
          Mapping your architecture...
        </p>
        <p className="text-sm font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
          Fetching &bull; Parsing &bull; Analyzing
        </p>
      </div>
    </motion.div>
  );
}

