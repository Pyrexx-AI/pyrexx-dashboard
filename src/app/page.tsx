"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import LoadingAnimation from "@/components/LoadingAnimation";
import DashboardHome from "@/components/DashboardHome";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  // Simulate the 3 "pulses" (approx 3.5 seconds) before zooming into the dashboard
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3500);
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