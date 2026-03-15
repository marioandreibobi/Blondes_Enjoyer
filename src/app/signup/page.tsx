"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hexagon, Eye, EyeOff, UserPlus, Mail, ArrowLeft } from "lucide-react";
import BlueprintGrid from "@/components/UI/BlueprintGrid";

type Step = "form" | "verify";

export default function SignupPage(): React.ReactElement {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function handleSendCode(e: React.FormEvent): Promise<void> {
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
      const res = await fetch("/api/auth/signup/send-code", {
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

      setStep("verify");
      setResendCooldown(120);
      setCode(["", "", "", "", "", ""]);
      setLoading(false);
      // Focus first code input on next render
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  function handleCodeChange(index: number, value: string): void {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-advance to next input
    if (digit && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent): void {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  }

  function handleCodePaste(e: React.ClipboardEvent): void {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 0) return;
    const newCode = [...code];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || "";
    }
    setCode(newCode);
    const focusIdx = Math.min(pasted.length, 5);
    codeRefs.current[focusIdx]?.focus();
  }

  async function handleVerify(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError("");

    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: fullCode }),
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

  async function handleResend(): Promise<void> {
    if (resendCooldown > 0) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to resend code.");
        setLoading(false);
        return;
      }

      setResendCooldown(120);
      setCode(["", "", "", "", "", ""]);
      setLoading(false);
      codeRefs.current[0]?.focus();
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
            <Hexagon className="h-7 w-7" style={{ color: "#E07B54" }} />
            <span className="text-2xl font-bold tracking-tight" style={{ color: "#F2EDE8" }}>
              Code<span style={{ color: "#E07B54" }}>Atlas</span>
            </span>
          </a>

          {/* Card */}
          <div
            className="rounded-xl p-8"
            style={{
              background: "rgba(37,30,24,0.85)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 0 40px rgba(224,123,84,0.08)",
            }}
          >
            <AnimatePresence mode="wait">
              {step === "form" ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg" style={{ background: "rgba(224,123,84,0.15)" }}>
                      <UserPlus className="h-5 w-5" style={{ color: "#E07B54" }} />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold" style={{ color: "#F2EDE8" }}>
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

                  <form onSubmit={handleSendCode} className="space-y-4">
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
                        className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-[#E07B54]"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#F2EDE8",
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
                        className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-[#E07B54]"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#F2EDE8",
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
                          className="w-full rounded-lg px-4 py-2.5 pr-10 text-sm outline-none transition-all focus:ring-2 focus:ring-[#E07B54]"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "#F2EDE8",
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
                        className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-[#E07B54]"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#F2EDE8",
                        }}
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
                      style={{
                        background: loading ? "rgba(224,123,84,0.5)" : "rgba(224,123,84,0.85)",
                        boxShadow: "0 0 20px rgba(224,123,84,0.25)",
                      }}
                    >
                      {loading ? "Sending Code..." : "Continue"}
                    </button>
                  </form>

                  {/* Login link */}
                  <p className="text-center text-sm mt-6" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Already have an account?{" "}
                    <a
                      href="/login"
                      className="font-medium hover:underline"
                      style={{ color: "#E07B54" }}
                    >
                      Sign in
                    </a>
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                >
                  <button
                    onClick={() => { setStep("form"); setError(""); }}
                    className="flex items-center gap-1 text-sm mb-4 transition-colors"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>

                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg" style={{ background: "rgba(224,123,84,0.15)" }}>
                      <Mail className="h-5 w-5" style={{ color: "#E07B54" }} />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold" style={{ color: "#F2EDE8" }}>
                        Verify Your Email
                      </h1>
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                        Code sent to <span style={{ color: "#D4A857" }}>{email.trim()}</span>
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

                  <form onSubmit={handleVerify} className="space-y-6">
                    {/* 6-digit code input */}
                    <div>
                      <label className="block text-sm font-medium mb-3 text-center" style={{ color: "rgba(255,255,255,0.6)" }}>
                        Enter 6-digit verification code
                      </label>
                      <div className="flex justify-center gap-2">
                        {code.map((digit, i) => (
                          <input
                            key={i}
                            ref={(el) => { codeRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleCodeChange(i, e.target.value)}
                            onKeyDown={(e) => handleCodeKeyDown(i, e)}
                            onPaste={i === 0 ? handleCodePaste : undefined}
                            className="w-12 h-14 text-center text-xl font-bold rounded-lg outline-none transition-all focus:ring-2 focus:ring-[#E07B54]"
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              border: digit ? "1px solid rgba(224,123,84,0.4)" : "1px solid rgba(255,255,255,0.1)",
                              color: "#F2EDE8",
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Verify button */}
                    <button
                      type="submit"
                      disabled={loading || code.join("").length !== 6}
                      className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
                      style={{
                        background: loading ? "rgba(224,123,84,0.5)" : "rgba(224,123,84,0.85)",
                        boxShadow: "0 0 20px rgba(224,123,84,0.25)",
                      }}
                    >
                      {loading ? "Verifying..." : "Create Account"}
                    </button>
                  </form>

                  {/* Resend */}
                  <p className="text-center text-sm mt-6" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Didn&apos;t receive the code?{" "}
                    {resendCooldown > 0 ? (
                      <span style={{ color: "rgba(255,255,255,0.3)" }}>
                        Resend in {resendCooldown}s
                      </span>
                    ) : (
                      <button
                        onClick={handleResend}
                        disabled={loading}
                        className="font-medium hover:underline disabled:opacity-50"
                        style={{ color: "#E07B54" }}
                      >
                        Resend code
                      </button>
                    )}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </>
  );
}
