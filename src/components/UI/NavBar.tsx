"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hexagon, User, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/components/Auth/AuthProvider";

interface NavBarProps {
  showCta?: boolean;
}

export default function NavBar({ showCta = true }: NavBarProps): React.ReactElement {
  const { user, loading, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(28,22,18,0.92)",
        borderBottom: "1px solid rgba(61,48,40,0.5)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        <a href="/" className="flex items-center gap-2 group">
          <Hexagon className="h-5 w-5 transition-all" style={{ color: "#E07B54" }} />
          <span className="text-lg font-bold tracking-tight" style={{ color: "#F2EDE8" }}>
            Code<span style={{ color: "#E07B54" }}>Atlas</span>
          </span>
        </a>

        <div className="hidden sm:flex items-center gap-6">
          <a href="#process" className="text-sm transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
            How it Works
          </a>
          <a href="#views" className="text-sm transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
            Views
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-brand">
            Pricing
          </a>
          <a href="/feedback" className="text-sm transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
            Feedback
          </a>

          {/* Auth section */}
          {!loading && (
            <>
              {user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
                    style={{
                      background: "rgba(224,123,84,0.15)",
                      border: "1px solid rgba(224,123,84,0.25)",
                      color: "#F2EDE8",
                    }}
                  >
                    <User className="h-4 w-4" />
                    <span className="max-w-[120px] truncate">{user.name}</span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-56 rounded-lg py-1 z-[60]"
                        style={{
                          background: "rgba(37,30,24,0.95)",
                          border: "1px solid rgba(61,48,40,0.5)",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                        }}
                      >
                        <div className="px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <p className="text-sm font-medium" style={{ color: "#F2EDE8" }}>{user.name}</p>
                          <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{user.email}</p>
                        </div>
                        <button
                          onClick={() => { setDropdownOpen(false); logout(); }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                          style={{ color: "#f87171" }}
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <a
                    href="/login"
                    className="text-sm font-medium transition-colors hover:underline"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    Sign In
                  </a>
                  {showCta && (
                    <a
                      href="/signup"
                      className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-all"
                      style={{ background: "rgba(224,123,84,0.85)", boxShadow: "0 0 12px rgba(224,123,84,0.3)" }}
                    >
                      Sign Up
                    </a>
                  )}
                </div>
              )}
            </>

          )}
        </div>
      </div>
    </motion.nav>
  );
}
