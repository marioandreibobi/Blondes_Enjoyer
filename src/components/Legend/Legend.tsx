"use client";

import React from "react";

const CATEGORY_ITEMS = [
  { color: "#22c55e", label: "Core" },
  { color: "#a855f7", label: "Services" },
  { color: "#06b6d4", label: "Utilities" },
  { color: "#ec4899", label: "QA" },
  { color: "#3b82f6", label: "Configuration" },
];

const RISK_ITEMS = [
  { color: "#22c55e", label: "Low Risk" },
  { color: "#f59e0b", label: "Medium Risk" },
  { color: "#ef4444", label: "High Risk" },
  { color: "#6366f1", label: "Critical Risk" },
];

export default function Legend(): React.ReactElement {
  return (
    <div
      className="absolute bottom-4 left-4 z-20 flex flex-col gap-3 px-4 py-3 rounded-xl"
      style={{
        background: "rgba(10,14,39,0.85)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Category colors */}
      <div className="flex flex-col gap-1.5">
        {CATEGORY_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
              style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}40` }}
            />
            <span className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.55)" }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />

      {/* Risk levels */}
      <div className="flex flex-col gap-1.5">
        {RISK_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
              style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}40` }}
            />
            <span className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.55)" }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

