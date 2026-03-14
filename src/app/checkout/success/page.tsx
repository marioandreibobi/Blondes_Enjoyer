"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowLeft, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import BlueprintGrid from "@/components/UI/BlueprintGrid";
import NavBar from "@/components/UI/NavBar";

interface VerifiedSession {
  plan: string;
  billing: string;
  customerEmail: string | null;
}

export default function CheckoutSuccessPage(): React.ReactElement {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "verified" | "error">(
    sessionId ? "loading" : "error"
  );
  const [session, setSession] = useState<VerifiedSession | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    fetch(`/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Verification failed");
        const data: VerifiedSession = await res.json();
        setSession(data);
        setStatus("verified");
      })
      .catch(() => {
        setStatus("error");
      });
  }, [sessionId]);

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
          {status === "loading" && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Verifying payment...
              </h1>
            </>
          )}

          {status === "verified" && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Payment Successful!
              </h1>
              <p className="text-muted-foreground mb-6">
                Welcome to CodeAtlas{" "}
                <span className="capitalize font-medium text-foreground">
                  {session?.plan}
                </span>
                . Your {session?.billing} subscription is now active.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold transition-brand hover:brightness-110 glow-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to CodeAtlas
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Verification Failed
              </h1>
              <p className="text-muted-foreground mb-6">
                We couldn&apos;t verify your payment. If you were charged, please
                contact support.
              </p>
              <Link
                href="/#pricing"
                className="inline-flex items-center gap-2 rounded-lg bg-secondary text-foreground border border-border px-5 py-2.5 text-sm font-semibold transition-brand hover:border-primary/30"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Plans
              </Link>
            </>
          )}
        </motion.div>
      </main>
    </>
  );
}
