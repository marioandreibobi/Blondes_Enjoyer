// ─── Graph Node ───────────────────────────────────────────────

export type NodeType =
  | "route"
  | "controller"
  | "service"
  | "model"
  | "middleware"
  | "util"
  | "config"
  | "test"
  | "entry";

export type Complexity = "low" | "medium" | "high";
export type Severity = "low" | "medium" | "high";

export interface GraphNode {
  id: string; // file path
  type: NodeType;
  lines: number;
  imports: number; // count of files this imports
  importedBy: number; // count of files that import this
  description: string; // AI-generated 1-liner
  risk: string | null; // AI-generated risk flag or null
  complexity: Complexity;
}

export interface GraphLink {
  source: string; // file path
  target: string; // file path
}

// ─── AI Analysis ──────────────────────────────────────────────

export interface RiskHotspot {
  file: string;
  reason: string;
  severity: Severity;
}

export interface OnboardingStep {
  title: string;
  file: string | string[];
  explanation: string;
}

export interface AIAnalysis {
  summary: string;
  riskHotspots: RiskHotspot[];
  onboarding: {
    steps: OnboardingStep[];
  };
}

// ─── Full Result ──────────────────────────────────────────────

export interface RepoInfo {
  name: string;
  owner: string;
  language: string;
  totalFiles: number;
  analyzedFiles: number;
}

export interface AnalysisResult {
  repo: RepoInfo;
  graph: {
    nodes: GraphNode[];
    links: GraphLink[];
  };
  ai: AIAnalysis;
}

// ─── API Request / Response ───────────────────────────────────

export interface AnalyzeRequest {
  repoUrl: string;
}

export interface AnalyzeResponse {
  id: string;
  result: AnalysisResult;
}

export interface ApiError {
  error: string;
  status: number;
}

// ─── Parsed File (internal) ───────────────────────────────────

export interface ParsedFile {
  path: string;
  content: string;
  lines: number;
  imports: string[]; // resolved relative paths
}

// ─── GitHub API (internal) ────────────────────────────────────

export interface RepoTreeItem {
  path: string;
  type: "blob" | "tree";
  size?: number;
  sha: string;
}
