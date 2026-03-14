"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trees, Shrub, Leaf } from "lucide-react";

const LENSES = [
  {
    icon: Trees,
    title: "Forest",
    subtitle: "Full Repo View",
    description:
      "See every file and connection. Zoom out to spot clusters, orphans, and structural patterns at a glance.",
  },
  {
    icon: Shrub,
    title: "Grove",
    subtitle: "Module View",
    description:
      "Focus on a directory or feature cluster. Understand boundaries between modules and shared dependencies.",
  },
  {
    icon: Leaf,
    title: "Tree",
    subtitle: "File View",
    description:
      "Click any node to drill into a single file — its imports, importers, complexity, and AI risk assessment.",
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

export default function ViewsGrid(): React.ReactElement {
  return (
    <section id="views" className="relative z-10 py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Three <span className="text-gradient-primary">Lenses</span>
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            From 30,000 feet to a single function call.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {LENSES.map((lens, i) => (
            <motion.div
              key={lens.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="rounded-xl bg-glass border-glass shadow-blueprint p-6 group hover:border-primary/20 transition-brand"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <lens.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{lens.title}</h3>
              <p className="text-xs text-primary font-mono mb-2">{lens.subtitle}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {lens.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
