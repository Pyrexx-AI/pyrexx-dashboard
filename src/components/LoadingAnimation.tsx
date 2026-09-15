"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const SIZE = 120;

export default function LoadingAnimation() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-md"
      style={{ background: "var(--bg-base)" }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.25, ease: "easeOut" } }}
      aria-live="polite"
      aria-label="Loading Pyrexx AI dashboard"
    >
      {/* Soft Ambient Background Glow */}
      {!reducedMotion && (
        <div
          className="absolute rounded-full blur-3xl pointer-events-none opacity-40 animate-pulse"
          style={{
            width: 280,
            height: 280,
            background: "radial-gradient(circle, rgba(72,196,198,0.25) 0%, rgba(137,82,165,0.15) 60%, transparent 100%)",
          }}
        />
      )}

      {/* Brand Symbol Container */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <svg
          width={SIZE}
          height={SIZE}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-md"
        >
          {/* Animated Hardware-Accelerated Path Rings */}
          <motion.circle
            cx="50"
            cy="50"
            r="42"
            stroke="var(--teal)"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0, rotate: 0 }}
            animate={{ pathLength: [0.2, 0.8, 0.2], rotate: 360 }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.circle
            cx="50"
            cy="50"
            r="32"
            stroke="var(--purple)"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0, rotate: 0 }}
            animate={{ pathLength: [0.6, 0.1, 0.6], rotate: -360 }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </svg>

        <p
          className="text-xs font-bold tracking-[0.2em] uppercase"
          style={{ color: "var(--text-muted)" }}
        >
          Pyrexx AI
        </p>
      </motion.div>
    </motion.div>
  );
}