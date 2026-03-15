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
  strength?: number; // relationship weight for visual thickness/color
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

export type AIApproach = "architecture" | "security";

export interface AnalyzeRequest {
  repoUrl: string;
  dualMode?: boolean;
}

export interface AnalyzeResponse {
  id: string;
  result: AnalysisResult;
  resultB?: AnalysisResult;
}

export interface ApiError {
  error: string;
  status: number;
}

// ─── Chat ─────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  message: string;
  mood?: "neutral" | "excited" | "calm" | "frustrated" | "happy";
  context: {
    repo: RepoInfo;
    nodes: Array<{ id: string; type: string; lines: number; complexity: string; description: string; risk: string | null }>;
    links: Array<{ source: string; target: string }>;
    aiSummary: string;
    riskHotspots: RiskHotspot[];
  };
  history: Array<{ role: "user" | "assistant"; content: string }>;
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
