"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Hexagon, Eye, EyeOff, UserPlus } from "lucide-react";
import BlueprintGrid from "@/components/UI/BlueprintGrid";

export default function SignupPage(): React.ReactElement {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <BlueprintGrid />
      <div className="min-h-screen flex items-center justify-center px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <a href="/" className="flex items-center justify-center gap-2 mb-8 group">
            <Hexagon className="h-7 w-7" style={{ color: "#6366f1" }} />
            <span className="text-2xl font-bold tracking-tight" style={{ color: "#e2e8f0" }}>
              Code<span style={{ color: "#6366f1" }}>Atlas</span>
            </span>
          </a>

          {/* Card */}
          <div
            className="rounded-xl p-8"
            style={{
              background: "rgba(15,19,50,0.85)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 0 40px rgba(99,102,241,0.08)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg" style={{ background: "rgba(99,102,241,0.15)" }}>
                <UserPlus className="h-5 w-5" style={{ color: "#6366f1" }} />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: "#e2e8f0" }}>
                  Create Account
                </h1>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Start exploring codebases visually
                </p>
              </div>
            </div>

            {error && (
              <div
                className="rounded-lg px-4 py-3 mb-4 text-sm"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#f87171",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="John Doe"
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#e2e8f0",
                  }}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all focus:ring-2"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#e2e8f0",
                  }}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="w-full rounded-lg px-4 py-2.5 pr-10 text-sm outline-none transition-all focus:ring-2"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#e2e8f0",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter your password"
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all focus:ring-2"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#e2e8f0",
                  }}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{
                  background: loading ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.85)",
                  boxShadow: "0 0 20px rgba(99,102,241,0.25)",
                }}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            {/* Login link */}
            <p className="text-center text-sm mt-6" style={{ color: "rgba(255,255,255,0.4)" }}>
              Already have an account?{" "}
              <a
                href="/login"
                className="font-medium hover:underline"
                style={{ color: "#6366f1" }}
              >
                Sign in
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
}
