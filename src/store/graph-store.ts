import { create } from "zustand";
import type { GraphNode, AnalysisResult, NodeType } from "@/types";

interface GraphState {
  // Data
  analysisResult: AnalysisResult | null;

  // Selection
  selectedNode: GraphNode | null;
  hoveredNode: GraphNode | null;

  // Filters
  typeFilters: Set<NodeType>;
  complexityFilter: "all" | "low" | "medium" | "high";

  // UI
  sidebarOpen: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  setAnalysisResult: (result: AnalysisResult) => void;
  selectNode: (node: GraphNode | null) => void;
  hoverNode: (node: GraphNode | null) => void;
  toggleTypeFilter: (type: NodeType) => void;
  setTypeFilters: (types: Set<NodeType>) => void;
  setComplexityFilter: (filter: "all" | "low" | "medium" | "high") => void;
  toggleSidebar: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  analysisResult: null,
  selectedNode: null,
  hoveredNode: null,
  typeFilters: new Set<NodeType>(),
  complexityFilter: "all" as const,
  sidebarOpen: true,
  loading: false,
  error: null,
};

export const useGraphStore = create<GraphState>((set) => ({
  ...initialState,

  setAnalysisResult: (result) =>
    set({ analysisResult: result, loading: false, error: null }),

  selectNode: (node) => set({ selectedNode: node, sidebarOpen: node !== null }),

  hoverNode: (node) => set({ hoveredNode: node }),

  toggleTypeFilter: (type) =>
    set((state) => {
      const next = new Set(state.typeFilters);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return { typeFilters: next };
    }),

  setTypeFilters: (types) => set({ typeFilters: new Set(types) }),

  setComplexityFilter: (filter) => set({ complexityFilter: filter }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error, loading: false }),

  reset: () => set(initialState),
}));
