"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function LoadingAnimation() {
  // FIX [8]: Read system reduced-motion preference
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#160B24]"
      initial={{ opacity: 1 }}
      exit={
        reducedMotion
          ? { opacity: 0, transition: { duration: 0.15 } }
          : {
              opacity: 0,
              // FIX [7]: scale:120 was extreme and caused GPU thrash.
              // scale:1.6 gives the same "zooming through" feel at a fraction of the cost.
              scale: 1.6,
              transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] },
            }
      }
      aria-live="polite"
      aria-label="Loading Pyrexx AI dashboard"
    >
      <div className="relative flex flex-col items-center justify-center">
        {/* Ambient glow — suppressed for reduced-motion */}
        {!reducedMotion && (
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.12, 0.28, 0.12] }}
            transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity }}
            className="absolute w-44 h-44 rounded-full blur-3xl z-0"
            style={{ background: "#48C4C6" }}
          />
        )}

        {/* Pyrexx Logo Mark */}
        <motion.div
          className="relative z-10 w-36 h-36 drop-shadow-2xl"
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.85 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" aria-hidden="true">
            {/* Static outer dark border */}
            <g
              stroke="#1a0d2e"
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            >
              <path d="M 80 20 L 30 80 C 20 95 5 85 10 70 L 10 30 C 5 15 20 5 30 20 L 80 80" />
              <path d="M 20 20 L 70 80 C 80 95 95 85 90 70 L 90 30 C 95 15 80 5 70 20 L 20 80" />
            </g>

            {/* Static inner white gap */}
            <g
              stroke="#160B24"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            >
              <path d="M 80 20 L 30 80 C 20 95 5 85 10 70 L 10 30 C 5 15 20 5 30 20 L 80 80" />
              <path d="M 20 20 L 70 80 C 80 95 95 85 90 70 L 90 30 C 95 15 80 5 70 20 L 20 80" />
            </g>

            {/* Animated color ribbons */}
            <motion.g
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              animate={reducedMotion ? {} : { rotate: 180 }}
              transition={{
                duration: 1.1,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 0.4,
              }}
              style={{ originX: "50%", originY: "50%" }}
            >
              <path
                d="M 80 20 L 30 80 C 20 95 5 85 10 70 L 10 30 C 5 15 20 5 30 20 L 80 80"
                stroke="#48C4C6"
              />
              <path
                d="M 20 20 L 70 80 C 80 95 95 85 90 70 L 90 30 C 95 15 80 5 70 20 L 20 80"
                stroke="#8952A5"
              />
            </motion.g>
          </svg>
        </motion.div>

        {/* Brand wordmark */}
        <motion.p
          className="mt-6 text-sm font-semibold tracking-[0.2em] uppercase text-white/50"
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Pyrexx AI
        </motion.p>
      </div>
    </motion.div>
  );
}
