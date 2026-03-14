"use client";

import React, { useState } from "react";
import { useGraphStore } from "@/store/graph-store";

export default function OnboardingPanel(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(true);
  const analysisResult = useGraphStore((s) => s.analysisResult);
  const steps = analysisResult?.ai.onboarding.steps ?? [];

  if (steps.length === 0) return <></>;

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <span className="text-sm font-semibold text-foreground">
          Onboarding Guide ({steps.length} steps)
        </span>
        <span className="text-muted-foreground text-xs">
          {isOpen ? "\u25B2" : "\u25BC"}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-border p-3 space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {Array.isArray(step.file)
                    ? step.file.join(", ")
                    : step.file}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {step.explanation}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

