"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import BlueprintGrid from "@/components/UI/BlueprintGrid";
import NavBar from "@/components/UI/NavBar";

export default function CheckoutSuccessPage(): React.ReactElement {
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
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Payment Successful!
          </h1>
          <p className="text-muted-foreground mb-6">
            Welcome to CodeAtlas Pro. Your subscription is now active and you
            have full access to all features.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold transition-brand hover:brightness-110 glow-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to CodeAtlas
          </Link>
        </motion.div>
      </main>
    </>
  );
}
