import type { NodeType } from "@/types";

// ─── Category type ─────────────────────────────────────────────────────────────

export type CategoryType = "core" | "services" | "utilities" | "qa" | "configuration";

// ─── Node type display info ────────────────────────────────────────────────────

export const NODE_TYPES: Record<string, { color: string; label: string }> = {
  route:      { color: "#E07B54", label: "Route" },
  controller: { color: "#E07B54", label: "Controller" },
  entry:      { color: "#E07B54", label: "Entry" },
  middleware: { color: "#9C7FCB", label: "Middleware" },
  service:    { color: "#6BAF7C", label: "Service" },
  model:      { color: "#6BAF7C", label: "Model" },
  util:       { color: "#D4A857", label: "Utility" },
  test:       { color: "#6BAF7C", label: "Test" },
  config:     { color: "#6B5E56", label: "Config" },
};

// ─── Category helpers ──────────────────────────────────────────────────────────

export function getCategory(type: NodeType): CategoryType {
  if (type === "service" || type === "model") return "services";
  if (type === "test") return "qa";
  if (type === "config") return "configuration";
  if (type === "util") return "utilities";
  return "core"; // entry, route, controller, middleware
}

export const STORE_CATEGORY_MAP: Record<string, CategoryType[]> = {
  core:      ["core"],
  services:  ["services"],
  utilities: ["utilities"],
  testing:   ["qa"],
  config:    ["configuration"],
};

// ─── Colors ────────────────────────────────────────────────────────────────────

export const NODE_COLORS: Record<CategoryType, { dot: string; bg: string; border: string; text: string }> = {
  core:          { dot: "#E07B54", bg: "rgba(224,123,84,0.15)",  border: "rgba(224,123,84,0.5)",  text: "#E07B54" },
  services:      { dot: "#6BAF7C", bg: "rgba(107,175,124,0.15)", border: "rgba(107,175,124,0.5)", text: "#6BAF7C" },
  utilities:     { dot: "#D4A857", bg: "rgba(212,168,87,0.15)",  border: "rgba(212,168,87,0.5)",  text: "#D4A857" },
  qa:            { dot: "#9C7FCB", bg: "rgba(156,127,203,0.15)", border: "rgba(156,127,203,0.5)", text: "#9C7FCB" },
  configuration: { dot: "#6B5E56", bg: "rgba(107,94,86,0.15)",   border: "rgba(107,94,86,0.5)",   text: "#9A8F87" },
};

export const RISK_COLORS = {
  low:      "#22c55e",
  medium:   "#fbbf24",
  high:     "#ef4444",
  critical: "#dc2626",
} as const;

export type RiskLevel = keyof typeof RISK_COLORS;

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function complexityToNumber(c: string): number {
  if (c === "high") return 85;
  if (c === "medium") return 55;
  return 25;
}
