"use client";

import React, { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Terminal, GitBranch, FileCode, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import ViewSwitcher from "@/components/UI/ViewSwitcher";
import HeroMiniGraph from "@/components/UI/HeroMiniGraph";
import CodescapeVisual from "@/components/UI/CodescapeVisual";

const STATS = [
  { icon: GitBranch, label: "Repos Analyzed", value: "1,200+" },
  { icon: FileCode, label: "Files Mapped", value: "85K+" },
  { icon: Shield, label: "Risks Found", value: "3,400+" },
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] as const } },
};

export default function HeroSection(): React.ReactElement {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"3d" | "diagram">("3d");
  const router = useRouter();

  const githubUrlPattern =
    /^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/?$/;

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    const cleaned = url.trim().replace(/\.git\/?$/, "");
    const match = cleaned.match(githubUrlPattern);
    if (!match) {
      setError("Please enter a valid GitHub URL (https://github.com/owner/repo)");
      return;
    }

    const [, owner, repo] = match;
    setLoading(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      router.push(`/analyze/${owner}/${repo}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="hero" className="relative z-10 pt-24 pb-16 md:pt-32 md:pb-24">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left column */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-medium text-primary">
                <Shield className="h-3 w-3" />
                QA DNA &mdash; VibeHack 2026
              </span>
            </motion.div>

            <motion.h1
              id="hero-motto"
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
            >
              Map your repo.
              <br />
              <span className="text-gradient-primary">Understand everything.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-lg text-muted-foreground max-w-lg"
            >
              Paste a GitHub URL and explore its architecture as an interactive
              3D graph &mdash; powered by AI analysis.
            </motion.p>

            {/* Terminal-style input */}
            <motion.form
              variants={fadeUp}
              onSubmit={handleSubmit}
              className="w-full max-w-lg"
            >
              <div id="repo-input-wrapper" className="flex items-center gap-2 rounded-xl bg-glass border-glass shadow-blueprint p-1.5 transition-all duration-500">
                <div className="flex items-center gap-2 pl-3 text-muted-foreground">
                  <Terminal className="h-4 w-4" />
                  <span className="text-xs font-mono hidden sm:inline">~/repo $</span>
                </div>
                <input
                  id="repo-url-input"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="flex-1 bg-transparent border-none text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none py-2"
                  disabled={loading}
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 glow-primary transition-brand"
                >
                  {loading ? "Mapping..." : "Analyze"}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-sm text-destructive">{error}</p>
              )}
            </motion.form>

            {/* Stats row */}
            <motion.div variants={fadeUp} className="flex gap-6 pt-2">
              {STATS.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <s.icon className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-bold text-foreground">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right column — visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="flex justify-end mb-3">
              <ViewSwitcher value={view} onSwitch={setView} />
            </div>
            <div className="rounded-2xl bg-glass border-glass shadow-blueprint overflow-hidden min-h-[320px]">
              {view === "3d" ? <HeroMiniGraph /> : <CodescapeVisual />}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
