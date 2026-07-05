"use client";

import { useState, useEffect, Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import LoadingAnimation from "@/components/LoadingAnimation";
import DashboardHome from "@/components/DashboardHome";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
          <Suspense key="dashboard" fallback={null}>
            <DashboardHome />
          </Suspense>
        )}
      </AnimatePresence>
    </main>
  );
}