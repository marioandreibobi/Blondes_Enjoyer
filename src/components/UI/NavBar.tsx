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
      className="fixed top-0 left-0 right-0 z-50 bg-glass border-b border-glass"
    >
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        <a href="/" className="flex items-center gap-2 group">
          <Hexagon className="h-5 w-5 text-primary transition-brand group-hover:glow-primary" />
          <span className="text-lg font-bold text-foreground tracking-tight">
            Code<span className="text-gradient-primary">Atlas</span>
          </span>
        </a>

        <div className="hidden sm:flex items-center gap-6">
          <a href="#process" className="text-sm text-muted-foreground hover:text-foreground transition-brand">
            How it Works
          </a>
          <a href="#views" className="text-sm text-muted-foreground hover:text-foreground transition-brand">
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
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 glow-primary transition-brand"
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
