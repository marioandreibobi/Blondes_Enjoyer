"use client";

import React from "react";
import { motion } from "framer-motion";
import { FileCode } from "lucide-react";

// ─── Match the actual DiagramView's category system ───────────

type Category = "core" | "middleware" | "services" | "utilities" | "qa" | "configuration";

interface MiniFile {
  name: string;
  category: Category;
  lines: number;
  deps: number;
  risk: "low" | "medium" | "high";
  complexity: number; // 0–100
}

const CATEGORY_COLORS: Record<Category, { dot: string; bg: string; border: string; text: string }> = {
  core:          { dot: "#3b82f6", bg: "rgba(59,130,246,0.15)",  border: "rgba(59,130,246,0.5)",  text: "#60a5fa" },
  middleware:    { dot: "#f59e0b", bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.5)",  text: "#fbbf24" },
  services:      { dot: "#22c55e", bg: "rgba(34,197,94,0.15)",   border: "rgba(34,197,94,0.5)",   text: "#4ade80" },
  utilities:     { dot: "#facc15", bg: "rgba(250,204,21,0.15)",  border: "rgba(250,204,21,0.5)",  text: "#fde047" },
  qa:            { dot: "#ec4899", bg: "rgba(236,72,153,0.15)",  border: "rgba(236,72,153,0.5)",  text: "#f472b6" },
  configuration: { dot: "#f97316", bg: "rgba(249,115,22,0.15)",  border: "rgba(249,115,22,0.5)",  text: "#fb923c" },
};

const SECTION_LABELS: Record<Category, string> = {
  core: "CORE",
  middleware: "MIDDLEWARE",
  services: "SERVICES",
  utilities: "UTILITIES",
  qa: "QA & TESTING",
  configuration: "CONFIGURATION",
};

const SECTION_SUBTITLES: Record<Category, string> = {
  core: "Application core & pages",
  middleware: "Request processing layers",
  services: "Business logic & integrations",
  utilities: "Components, helpers & state",
  qa: "Tests & quality assurance",
  configuration: "Build & project config",
};

const RISK_COLORS: Record<string, string> = { low: "#22c55e", medium: "#fbbf24", high: "#ef4444" };

const SAMPLE_FILES: MiniFile[] = [
  { name: "app.ts",      category: "core",          lines: 120, deps: 4, risk: "low",    complexity: 40 },
  { name: "router.ts",   category: "core",          lines: 280, deps: 6, risk: "medium", complexity: 65 },
  { name: "auth.ts",     category: "middleware",     lines: 190, deps: 3, risk: "high",   complexity: 80 },
  { name: "users.ts",    category: "services",       lines: 210, deps: 5, risk: "medium", complexity: 55 },
  { name: "db.ts",       category: "services",       lines: 95,  deps: 2, risk: "low",    complexity: 30 },
  { name: "utils.ts",    category: "utilities",      lines: 60,  deps: 1, risk: "low",    complexity: 20 },
  { name: "helpers.ts",  category: "utilities",      lines: 45,  deps: 0, risk: "low",    complexity: 15 },
  { name: "config.ts",   category: "configuration",  lines: 35,  deps: 0, risk: "low",    complexity: 10 },
  { name: "test.spec.ts",category: "qa",             lines: 150, deps: 3, risk: "low",    complexity: 35 },
  { name: "e2e.spec.ts", category: "qa",             lines: 220, deps: 2, risk: "medium", complexity: 50 },
  { name: "ctrl.ts",     category: "core",           lines: 310, deps: 7, risk: "high",   complexity: 90 },
  { name: "api.ts",      category: "core",           lines: 175, deps: 4, risk: "medium", complexity: 70 },
];

const SECTIONS: Category[] = ["core", "middleware", "services", "utilities", "qa", "configuration"];

function groupByCategory(files: MiniFile[]): Record<Category, MiniFile[]> {
  const map: Record<Category, MiniFile[]> = { core: [], middleware: [], services: [], utilities: [], qa: [], configuration: [] };
  for (const f of files) map[f.category].push(f);
  return map;
}

function MiniNodeCard({ file, delay }: { file: MiniFile; delay: number }): React.ReactElement {
  const colors = CATEGORY_COLORS[file.category];
  const riskColor = RISK_COLORS[file.risk];
  const compColor = file.complexity > 75 ? "#ef4444" : file.complexity > 50 ? "#fbbf24" : "#22c55e";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-md p-1.5 transition-all hover:scale-[1.04] cursor-default"
      style={{
        background: "rgba(15, 23, 42, 0.6)",
        border: `1px solid rgba(56, 189, 248, 0.08)`,
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0">
          <FileCode size={7} style={{ color: colors.dot, flexShrink: 0 }} />
          <span className="font-mono text-[7px] font-semibold truncate" style={{ color: colors.text }}>
            {file.name}
          </span>
        </div>
        <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: riskColor }} />
      </div>
      <div className="mt-0.5 flex items-center gap-1 text-[6px] text-slate-500">
        <span>{file.lines}L</span>
        {file.deps > 0 && (
          <>
            <span className="opacity-40">·</span>
            <span>{file.deps}d</span>
          </>
        )}
        <div className="ml-auto flex items-center">
          <div className="h-[3px] w-6 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${file.complexity}%`, backgroundColor: compColor }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function CodescapeVisual(): React.ReactElement {
  const grouped = groupByCategory(SAMPLE_FILES);
  const totalFiles = SAMPLE_FILES.length;
  const totalLines = SAMPLE_FILES.reduce((s, f) => s + f.lines, 0);
  let globalDelay = 0;

  return (
    <div
      className="w-full h-full min-h-[320px] overflow-hidden rounded-xl p-3"
      style={{
        background: "#0a0e27",
        backgroundImage: "radial-gradient(circle, rgba(56,189,248,0.04) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between mb-2"
      >
        <div>
          <h3 className="text-[8px] font-bold tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.7)" }}>
            City Map View
          </h3>
          <p className="text-[6px] text-slate-500 mt-px">
            {totalFiles} files · {totalLines.toLocaleString()} lines
          </p>
        </div>
        <div className="flex items-center gap-1">
          <div className="px-1.5 py-0.5 text-[6px] rounded-full" style={{ background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.5)", color: "#38bdf8" }}>
            All
          </div>
        </div>
      </motion.div>

      {/* Category sections */}
      <div className="space-y-2">
        {SECTIONS.map((cat) => {
          const files = grouped[cat];
          if (files.length === 0) return null;
          const colors = CATEGORY_COLORS[cat];
          const sectionDelay = globalDelay;
          globalDelay += 0.15;

          return (
            <motion.div
              key={cat}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: sectionDelay }}
            >
              {/* Section header */}
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: colors.dot }} />
                <span className="text-[7px] font-bold tracking-widest uppercase" style={{ color: colors.text }}>
                  {SECTION_LABELS[cat]}
                </span>
                <span className="text-[5px] text-slate-500">{SECTION_SUBTITLES[cat]}</span>
                <div className="flex-1 h-px" style={{ background: colors.border + "30" }} />
                <span className="text-[5px] text-slate-500">{files.length}</span>
              </div>

              {/* File cards grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
                {files.map((file, fi) => (
                  <MiniNodeCard key={file.name} file={file} delay={sectionDelay + 0.05 + fi * 0.04} />
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
