import React from "react";
import SearchBar from "@/components/SearchBar/SearchBar";

export default function HomePage(): React.ReactElement {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-3xl w-full text-center space-y-8">
        {/* Hero */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            Code<span className="text-primary">Atlas</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Paste a GitHub repository URL and explore its architecture as an
            interactive 3D graph &mdash; powered by AI analysis.
          </p>
        </div>

        {/* Search */}
        <SearchBar />

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
          <div className="rounded-lg border border-border bg-card p-4 text-left">
            <p className="text-sm font-semibold text-foreground">
              Dependency Graph
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              See how files connect via imports in a 3D force-directed graph.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-left">
            <p className="text-sm font-semibold text-foreground">
              Risk Hotspots
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              AI identifies complex, risky, or tightly-coupled files.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-left">
            <p className="text-sm font-semibold text-foreground">
              Onboarding Guide
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Get a step-by-step walkthrough for new developers.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

