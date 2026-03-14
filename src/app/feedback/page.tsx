"use client";

import React, { useState } from "react";
import { Hexagon, Send, ArrowLeft, CheckCircle } from "lucide-react";
import BlueprintGrid from "@/components/UI/BlueprintGrid";
import NavBar from "@/components/UI/NavBar";
import Footer from "@/components/UI/Footer";

export default function FeedbackPage(): React.ReactElement {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    const form = e.currentTarget;
    if (!form.checkValidity()) return;

    e.preventDefault();

    const formData = new FormData(form);

    fetch("https://formsubmit.co/ajax/filipcostache8@gmail.com", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
    })
      .then((res) => {
        if (res.ok) setSubmitted(true);
      })
      .catch(() => {
        // silently fail — user can retry
      });
  }

  return (
    <>
      <BlueprintGrid />
      <NavBar showCta={false} />

      <main className="relative min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
        <div
          className="w-full max-w-2xl rounded-2xl border p-8 md:p-10"
          style={{
            background: "rgba(10,14,39,0.85)",
            borderColor: "rgba(255,255,255,0.08)",
            boxShadow: "0 0 40px rgba(99,102,241,0.08)",
          }}
        >
          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <CheckCircle className="h-14 w-14" style={{ color: "#22c55e" }} />
              <h2 className="text-2xl font-bold" style={{ color: "#e2e8f0" }}>
                Thank you for your feedback!
              </h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                Your response has been sent. We truly appreciate you taking the time to help us improve.
              </p>
              <a
                href="/"
                className="mt-4 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all"
                style={{
                  background: "#6366f1",
                  color: "#fff",
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to CodeAtlas
              </a>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <Hexagon className="h-6 w-6" style={{ color: "#6366f1" }} />
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#e2e8f0" }}>
                  We&apos;d love your feedback
                </h1>
              </div>
              <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.45)" }}>
                You&apos;ve just explored CodeAtlas — please share your honest thoughts so we can
                make it better. All responses are sent directly to our team.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* Hidden FormSubmit config */}
                <input type="hidden" name="_subject" value="CodeAtlas Feedback" />
                <input type="hidden" name="_template" value="table" />
                <input type="hidden" name="_captcha" value="false" />

                {/* Overall impression */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="overall"
                    className="text-sm font-medium"
                    style={{ color: "#c7d2fe" }}
                  >
                    Overall impression *
                  </label>
                  <select
                    id="overall"
                    name="Overall Impression"
                    required
                    defaultValue=""
                    className="rounded-lg border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "rgba(255,255,255,0.1)",
                      color: "#e2e8f0",
                    }}
                  >
                    <option value="" disabled>
                      Select a rating...
                    </option>
                    <option value="Excellent">⭐ Excellent</option>
                    <option value="Good">👍 Good</option>
                    <option value="Average">😐 Average</option>
                    <option value="Needs Improvement">👎 Needs Improvement</option>
                    <option value="Poor">❌ Poor</option>
                  </select>
                </div>

                {/* Upsides */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="upsides"
                    className="text-sm font-medium"
                    style={{ color: "#c7d2fe" }}
                  >
                    What did you like? (Upsides) *
                  </label>
                  <textarea
                    id="upsides"
                    name="Upsides"
                    required
                    rows={3}
                    placeholder="e.g. The 3D graph is really cool, the onboarding was clear..."
                    className="rounded-lg border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 resize-none"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "rgba(255,255,255,0.1)",
                      color: "#e2e8f0",
                    }}
                  />
                </div>

                {/* Downsides */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="downsides"
                    className="text-sm font-medium"
                    style={{ color: "#c7d2fe" }}
                  >
                    What didn&apos;t you like? (Downsides) *
                  </label>
                  <textarea
                    id="downsides"
                    name="Downsides"
                    required
                    rows={3}
                    placeholder="e.g. Loading took a while, hard to navigate on mobile..."
                    className="rounded-lg border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 resize-none"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "rgba(255,255,255,0.1)",
                      color: "#e2e8f0",
                    }}
                  />
                </div>

                {/* Improvements */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="improvements"
                    className="text-sm font-medium"
                    style={{ color: "#c7d2fe" }}
                  >
                    What would you improve?
                  </label>
                  <textarea
                    id="improvements"
                    name="Improvements"
                    rows={3}
                    placeholder="e.g. Add a search inside the graph, support private repos..."
                    className="rounded-lg border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 resize-none"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "rgba(255,255,255,0.1)",
                      color: "#e2e8f0",
                    }}
                  />
                </div>

                {/* Email (optional) */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium"
                    style={{ color: "#c7d2fe" }}
                  >
                    Your email (optional — if you&apos;d like us to follow up)
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="Email"
                    placeholder="you@example.com"
                    className="rounded-lg border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "rgba(255,255,255,0.1)",
                      color: "#e2e8f0",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    color: "#fff",
                    boxShadow: "0 0 20px rgba(99,102,241,0.3)",
                  }}
                >
                  <Send className="h-4 w-4" />
                  Submit Feedback
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
