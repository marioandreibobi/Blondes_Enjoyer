"use client";

import React, { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTop(): React.ReactElement | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = (): void => {
      const halfPage = document.documentElement.scrollHeight / 2;
      setVisible(window.scrollY > halfPage - window.innerHeight);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center h-10 w-10 rounded-full bg-primary/70 backdrop-blur-sm text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-300"
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
