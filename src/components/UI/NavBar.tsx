"use client";

import React from "react";
import { motion } from "framer-motion";
import { Hexagon } from "lucide-react";

interface NavBarProps {
  showCta?: boolean;
}

export default function NavBar({ showCta = true }: NavBarProps): React.ReactElement {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(10,14,39,0.92)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        <a href="/" className="flex items-center gap-2 group">
          <Hexagon className="h-5 w-5 transition-all" style={{ color: "#6366f1" }} />
          <span className="text-lg font-bold tracking-tight" style={{ color: "#e2e8f0" }}>
            Code<span style={{ color: "#6366f1" }}>Atlas</span>
          </span>
        </a>

        <div className="hidden sm:flex items-center gap-6">
          <a href="#process" className="text-sm transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
            How it Works
          </a>
          <a href="#views" className="text-sm transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
            Views
          </a>
          {showCta && (
            <button
              onClick={() => {
                const motto = document.getElementById("hero-motto");
                const wrapper = document.getElementById("repo-input-wrapper");
                const input = document.getElementById("repo-url-input");
                if (motto) {
                  motto.scrollIntoView({ behavior: "smooth", block: "center" });
                }
                if (wrapper) {
                  wrapper.style.boxShadow = "0 0 0 2px hsl(var(--primary)), 0 0 20px hsl(var(--primary) / 0.35)";
                  setTimeout(() => {
                    input?.focus();
                  }, 600);
                  setTimeout(() => {
                    wrapper.style.boxShadow = "";
                  }, 2000);
                }
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-all"
              style={{ background: "rgba(99,102,241,0.8)", boxShadow: "0 0 12px rgba(99,102,241,0.3)" }}
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
