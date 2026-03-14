"use client";

import React from "react";
import { motion } from "framer-motion";
import { XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import BlueprintGrid from "@/components/UI/BlueprintGrid";
import NavBar from "@/components/UI/NavBar";

export default function CheckoutCancelPage(): React.ReactElement {
  return (
    <>
      <BlueprintGrid />
      <NavBar />
      <main className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="max-w-md w-full text-center rounded-xl bg-glass border-glass shadow-blueprint p-8"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Payment Cancelled
          </h1>
          <p className="text-muted-foreground mb-6">
            No worries — you weren&apos;t charged. You can upgrade anytime from
            the pricing section.
          </p>
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-2 rounded-lg bg-secondary text-foreground border border-border px-5 py-2.5 text-sm font-semibold transition-brand hover:border-primary/30"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Plans
          </Link>
        </motion.div>
      </main>
    </>
  );
}
