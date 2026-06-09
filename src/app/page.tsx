"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import LoadingAnimation from "@/components/LoadingAnimation";
import DashboardHome from "@/components/DashboardHome";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  // Synchronize perfectly with the 3.2s loading animation timeline
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50">
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