"use client";

import React from "react";
import { motion } from "framer-motion";

export default function LoadingAnimation() {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white dark:bg-pyrexx-darkBg"
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0,
        scale: 120, // Clean zoom through
        transition: { duration: 0.9, ease: "easeInOut" } 
      }}
    >
      <div className="relative flex flex-col items-center justify-center">
        {/* Soft background pulse */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
          className="absolute w-40 h-40 bg-pyrexx-blue rounded-full blur-3xl z-0"
        />

        {/* Exact Replica Pyrexx Logo SVG */}
        <motion.div className="relative z-10 w-40 h-40 drop-shadow-xl">
          <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
            
            {/* LAYER 1: Thick Outer Dark Grey Border */}
            <g stroke="#333333" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M 80 20 L 30 80 C 20 95 5 85 10 70 L 10 30 C 5 15 20 5 30 20 L 80 80" />
              <path d="M 20 20 L 70 80 C 80 95 95 85 90 70 L 90 30 C 95 15 80 5 70 20 L 20 80" />
            </g>

            {/* LAYER 2: Inner White Gap Border */}
            <g stroke="#ffffff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M 80 20 L 30 80 C 20 95 5 85 10 70 L 10 30 C 5 15 20 5 30 20 L 80 80" />
              <path d="M 20 20 L 70 80 C 80 95 95 85 90 70 L 90 30 C 95 15 80 5 70 20 L 20 80" />
            </g>

            {/* LAYER 3: Animated Colored Ribbons (Clockwise Swapping) */}
            <g strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
              {/* Left Ribbon */}
              <motion.path
                d="M 80 20 L 30 80 C 20 95 5 85 10 70 L 10 30 C 5 15 20 5 30 20 L 80 80"
                animate={{ stroke: ["#48C4C6", "#8952A5", "#48C4C6"] }}
                transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
              />
              {/* Right Ribbon */}
              <motion.path
                d="M 20 20 L 70 80 C 80 95 95 85 90 70 L 90 30 C 95 15 80 5 70 20 L 20 80"
                animate={{ stroke: ["#8952A5", "#48C4C6", "#8952A5"] }}
                transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
              />
            </g>
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
}