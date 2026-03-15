"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, BookOpen } from "lucide-react";
import { useGraphStore } from "@/store/graph-store";

export default function OnboardingPanel(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(true);
  const analysisResult = useGraphStore((s) => s.analysisResult);
  const steps = analysisResult?.ai.onboarding.steps ?? [];

  if (steps.length === 0) return <></>;

  return (
    <div className="rounded-xl bg-glass border-glass shadow-blueprint">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BookOpen className="h-3.5 w-3.5 text-primary" />
          Onboarding Guide ({steps.length} steps)
        </span>
        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-glass p-3 space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {step.title}
                    </p>
                    <p className="text-xs text-primary/70 font-mono mt-0.5">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

