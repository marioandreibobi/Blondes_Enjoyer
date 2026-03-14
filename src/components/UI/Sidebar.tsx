"use client";

import React from "react";
import { useGraphStore } from "@/store/graph-store";

export default function Sidebar(): React.ReactElement {
  const selectedNode = useGraphStore((s) => s.selectedNode);
  const sidebarOpen = useGraphStore((s) => s.sidebarOpen);
  const toggleSidebar = useGraphStore((s) => s.toggleSidebar);
  const analysisResult = useGraphStore((s) => s.analysisResult);

  if (!sidebarOpen) {
    return (
      <button
        onClick={toggleSidebar}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 rounded-l-md bg-card border border-r-0 border-border px-2 py-4 text-muted-foreground hover:text-foreground transition-colors"
      >
        &laquo;
      </button>
    );
  }

  const risk = analysisResult?.ai.riskHotspots.find(
    (h) => h.file === selectedNode?.id
  );

  return (
    <aside className="w-80 h-full border-l border-border bg-card overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Details</h2>
        <button
          onClick={toggleSidebar}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          X
        </button>
      </div>

      {!selectedNode ? (
        <div className="p-4 text-sm text-muted-foreground">
          Click a node to see details
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">File</p>
            <p className="text-sm font-mono text-foreground break-all">
              {selectedNode.id}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="text-sm capitalize text-foreground">
                {selectedNode.type}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Complexity</p>
              <p className="text-sm capitalize text-foreground">
                {selectedNode.complexity}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lines</p>
              <p className="text-sm text-foreground">{selectedNode.lines}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Imports</p>
              <p className="text-sm text-foreground">{selectedNode.imports}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Imported By</p>
              <p className="text-sm text-foreground">
                {selectedNode.importedBy}
              </p>
            </div>
          </div>
          {selectedNode.description && (
            <div>
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="text-sm text-foreground">
                {selectedNode.description}
              </p>
            </div>
          )}
          {risk && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-xs font-medium text-destructive">
                Risk &mdash; {risk.severity}
              </p>
              <p className="mt-1 text-sm text-foreground">{risk.reason}</p>
            </div>
          )}
        </div>
      )}

      {/* AI Summary */}
      {analysisResult?.ai.summary && (
        <div className="mt-auto border-t border-border p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            AI Summary
          </p>
          <p className="text-sm text-foreground">
            {analysisResult.ai.summary}
          </p>
        </div>
      )}
    </aside>
  );
}

