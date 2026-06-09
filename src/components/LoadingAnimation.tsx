"use client";

import React from "react";
import { motion } from "framer-motion";

export default function LoadingAnimation() {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white"
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0,
        scale: 120, // Clean zoom through the center
        transition: { duration: 0.9, ease: "easeInOut" } 
      }}
    >
      <div className="relative flex flex-col items-center justify-center">
        {/* Soft pulsing background glow */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
          className="absolute w-48 h-48 bg-pastel-light rounded-full blur-3xl z-0"
        />

        {/* Pyrexx 'X' Logo - Color Swapping Animation */}
        <motion.div className="relative z-10 w-32 h-32 drop-shadow-lg">
          <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
            {/* Ribbon 1 (Top-Left to Bottom-Right) */}
            <motion.path
              d="M 25 20 L 45 20 L 75 80 L 55 80 Z"
              strokeWidth="2"
              strokeLinejoin="round"
              fill="currentColor"
              animate={{
                color: ["#AEC6CF", "#8952A5", "#AEC6CF"], // Pastel Blue -> Purple -> Pastel Blue
                stroke: ["#7A9CAE", "#6B3B83", "#7A9CAE"]
              }}
              transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
            />
            {/* Ribbon 2 (Top-Right to Bottom-Left) */}
            <motion.path
              d="M 75 20 L 55 20 L 25 80 L 45 80 Z"
              strokeWidth="2"
              strokeLinejoin="round"
              fill="currentColor"
              animate={{
                color: ["#8952A5", "#AEC6CF", "#8952A5"], // Purple -> Pastel Blue -> Purple
                stroke: ["#6B3B83", "#7A9CAE", "#6B3B83"]
              }}
              transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
            />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
}