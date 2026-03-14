"use client";

import React from "react";
import { motion } from "framer-motion";
import { Search, Boxes, AlertTriangle } from "lucide-react";

const STEPS = [
  {
    phase: "01",
    icon: Search,
    title: "Indexing",
    description:
      "We fetch the repo tree, filter analyzable files, and extract every import statement.",
  },
  {
    phase: "02",
    icon: Boxes,
    title: "Clustering",
    description:
      "Files become nodes. Imports become edges. The graph builder classifies type and complexity.",
  },
  {
    phase: "03",
    icon: AlertTriangle,
    title: "Risk Mapping",
    description:
      "AI scans the graph for tightly-coupled areas, high-complexity hotspots, and missing coverage.",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.15, ease: [0.4, 0, 0.2, 1] as const },
  }),
};

export default function ProcessTimeline(): React.ReactElement {
  return (
    <section id="process" className="relative z-10 py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            How it <span className="text-gradient-primary">works</span>
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            Three steps from URL to full codebase map.
          </p>
        </motion.div>

        <div className="relative max-w-4xl mx-auto">
          {/* Connecting line */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent hidden md:block" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.phase}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                className="relative rounded-xl bg-glass border-glass shadow-blueprint p-6 group hover:border-primary/20 transition-brand"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-mono text-primary font-bold">
                    {step.phase}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <step.icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
