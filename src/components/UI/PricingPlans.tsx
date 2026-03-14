"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  Rocket,
  Building2,
  Check,
  GitBranch,
  Shield,
  Cpu,
  Users,
  Infinity,
  Loader2,
} from "lucide-react";

type BillingCycle = "monthly" | "annual";

interface PlanFeature {
  text: string;
  icon?: React.ElementType;
}

interface Plan {
  name: string;
  tagline: string;
  icon: React.ElementType;
  monthlyPrice: number | null;
  annualPrice: number | null;
  priceLabel?: string;
  cta: string;
  highlighted: boolean;
  features: PlanFeature[];
  extras?: string;
  paid: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Explorer",
    tagline: "For individual developers",
    icon: Zap,
    monthlyPrice: 0,
    annualPrice: 0,
    cta: "Start Free",
    highlighted: false,
    paid: false,
    features: [
      { text: "3 repo analyses per month", icon: GitBranch },
      { text: "Up to 100 files per repo" },
      { text: "Dependency graph visualization" },
      { text: "Basic risk detection", icon: Shield },
      { text: "Community support" },
    ],
  },
  {
    name: "Pro",
    tagline: "For everyday productivity",
    icon: Rocket,
    monthlyPrice: 19,
    annualPrice: 15,
    cta: "Upgrade to Pro",
    highlighted: true,
    paid: true,
    extras: "Everything in Explorer, plus:",
    features: [
      { text: "Unlimited repo analyses", icon: Infinity },
      { text: "Up to 500 files per repo" },
      { text: "AI-powered risk hotspots", icon: Cpu },
      { text: "Onboarding path generation" },
      { text: "Export graph as JSON / SVG" },
      { text: "Priority support" },
    ],
  },
  {
    name: "Team",
    tagline: "For engineering teams",
    icon: Building2,
    monthlyPrice: 49,
    annualPrice: 39,
    priceLabel: "per seat",
    cta: "Contact Sales",
    highlighted: false,
    paid: true,
    extras: "Everything in Pro, plus:",
    features: [
      { text: "Unlimited files per repo" },
      { text: "Team workspace & sharing", icon: Users },
      { text: "CI/CD integration hooks" },
      { text: "Custom risk rule definitions", icon: Shield },
      { text: "SSO & role-based access" },
      { text: "Dedicated account manager" },
    ],
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.15,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  }),
};

export default function PricingPlans(): React.ReactElement {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function formatPrice(plan: Plan): string {
    const price =
      billing === "annual" ? plan.annualPrice : plan.monthlyPrice;
    if (price === null) return "Custom";
    if (price === 0) return "$0";
    return `$${price}`;
  }

  async function handleCheckout(plan: Plan): Promise<void> {
    if (!plan.paid) return;

    setLoadingPlan(plan.name);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName: plan.name, billing }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Checkout failed");
      }

      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <section id="pricing" className="relative z-10 py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Choose your{" "}
            <span className="text-gradient-primary">plan</span>
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            Start free. Scale when you need to.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center rounded-full bg-secondary/60 border border-border p-1 gap-1">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-brand ${
                billing === "monthly"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-brand ${
                billing === "annual"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs opacity-80">save 20%</span>
            </button>
          </div>

          {/* Error message */}
          {error && (
            <p className="mt-4 text-sm text-destructive">{error}</p>
          )}
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className={`relative rounded-xl p-6 flex flex-col transition-brand ${
                plan.highlighted
                  ? "bg-glass border border-primary/30 shadow-blueprint glow-primary"
                  : "bg-glass border-glass shadow-blueprint hover:border-primary/20"
              }`}
            >
              {/* Popular badge */}
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                  Most Popular
                </span>
              )}

              {/* Icon + name */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    plan.highlighted
                      ? "bg-primary/20"
                      : "bg-primary/10"
                  }`}
                >
                  <plan.icon
                    className={`h-5 w-5 ${
                      plan.highlighted ? "text-primary" : "text-primary"
                    }`}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {plan.tagline}
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">
                  {formatPrice(plan)}
                </span>
                {plan.monthlyPrice !== null && plan.monthlyPrice > 0 && (
                  <span className="text-sm text-muted-foreground ml-1.5">
                    / mo{plan.priceLabel ? ` ${plan.priceLabel}` : ""}
                  </span>
                )}
                {plan.monthlyPrice === 0 && (
                  <span className="block text-sm text-muted-foreground mt-1">
                    Free forever
                  </span>
                )}
                {billing === "annual" &&
                  plan.annualPrice !== null &&
                  plan.annualPrice > 0 && (
                    <span className="block text-xs text-muted-foreground mt-1">
                      ${plan.annualPrice * 12} billed annually
                    </span>
                  )}
              </div>

              {/* CTA */}
              <button
                type="button"
                disabled={loadingPlan === plan.name}
                onClick={() => handleCheckout(plan)}
                className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-brand mb-6 disabled:opacity-60 disabled:cursor-not-allowed ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:brightness-110 glow-primary"
                    : "bg-secondary text-foreground border border-border hover:border-primary/30 hover:bg-secondary/80"
                }`}
              >
                {loadingPlan === plan.name ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecting…
                  </span>
                ) : (
                  plan.cta
                )}
              </button>

              {/* Divider */}
              <div className="h-px bg-border mb-4" />

              {/* Extras label */}
              {plan.extras && (
                <p className="text-xs font-semibold text-foreground mb-3">
                  {plan.extras}
                </p>
              )}

              {/* Features */}
              <ul className="space-y-2.5 flex-1">
                {plan.features.map((feature) => {
                  const Icon = feature.icon ?? Check;
                  return (
                    <li
                      key={feature.text}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <span className="text-muted-foreground">
                        {feature.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
