"use client";

import React from "react";
import { motion } from "framer-motion";
import { Hexagon } from "lucide-react";
import BlueprintGrid from "@/components/UI/BlueprintGrid";

export default function NotFound(): React.ReactElement {
  return (
    <>
      <BlueprintGrid />
      <main className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center"
        >
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-[120px] sm:text-[160px] font-bold leading-none text-gradient-primary"
          >
            404
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-6 rounded-xl bg-glass border-glass shadow-blueprint p-8 max-w-md mx-auto"
          >
            <div className="flex justify-center mb-4">
              <Hexagon className="h-8 w-8 text-primary animate-pulse-glow" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              Page not found
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The coordinates you requested don&apos;t exist on this map.
            </p>
            <a
              href="/"
              className="inline-block mt-5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 glow-primary transition-brand"
            >
              Return to Atlas
            </a>
          </motion.div>
        </motion.div>
      </main>
    </>
  );
}
