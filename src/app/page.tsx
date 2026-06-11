"use client";

// FIX [4]: This file must stay "use client" because it uses AnimatePresence.
// Metadata is now handled in layout.tsx (applies to all pages).
// For a multi-page app, create src/app/page-shell.tsx as server + import a
// "use client" PageClient component to get per-page metadata working.

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import LoadingAnimation from "@/components/LoadingAnimation";
import DashboardHome from "@/components/DashboardHome";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // FIX [6]: Skip the splash on return visits within the same session.
    // First visit: show 1400ms splash (down from 3200ms). Return visits: instant.
    const hasVisited = sessionStorage.getItem("pyrexx-loaded");

    if (hasVisited) {
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsLoading(false);
      sessionStorage.setItem("pyrexx-loaded", "1");
    }, 1400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <LoadingAnimation key="loading" />
        ) : (
          <DashboardHome key="dashboard" />
        )}
      </AnimatePresence>
    </main>
  );
}