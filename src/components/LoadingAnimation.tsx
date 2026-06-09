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
        scale: 150, // Massive zoom into the center of the "X"
        transition: { duration: 0.8, ease: "easeIn" } 
      }}
    >
      <div className="relative flex flex-col items-center justify-center">
        {/* Glowing backdrop matching the logo colors */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1, 1.2, 1, 1.2, 1], // 3 distinct pulses
            opacity: [0.3, 0.6, 0.3, 0.6, 0.3, 0.6, 0.3],
          }}
          transition={{ duration: 3, ease: "easeInOut" }}
          className="absolute w-40 h-40 bg-gradient-to-tr from-pyrexx-cyan to-pyrexx-purple rounded-full blur-3xl z-0"
        />

        {/* Custom Pyrexx X Logo matched to image */}
        <motion.div
          animate={{
            rotate: 360, // Clockwise rotation
            scale: [1, 1.1, 1, 1.1, 1, 1.1, 1] // Synced 3 pulses on the logo itself
          }}
          transition={{ duration: 3, ease: "easeInOut" }}
          className="relative z-10 w-32 h-32 drop-shadow-2xl"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
            {/* Pyrexx Cyan Ribbon */}
            <motion.path
              d="M 25 20 L 45 20 L 75 80 L 55 80 Z"
              fill="url(#cyan-gradient)"
              stroke="#1a1a1a"
              strokeWidth="1.5"
              strokeLinejoin="round"
              initial={{ pathLength: 0, fillOpacity: 0 }}
              animate={{ pathLength: 1, fillOpacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
            {/* Pyrexx Purple Ribbon */}
            <motion.path
              d="M 75 20 L 55 20 L 25 80 L 45 80 Z"
              fill="url(#purple-gradient)"
              stroke="#1a1a1a"
              strokeWidth="1.5"
              strokeLinejoin="round"
              initial={{ pathLength: 0, fillOpacity: 0 }}
              animate={{ pathLength: 1, fillOpacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
            />
            <defs>
              <linearGradient id="cyan-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#48C4C6" />
                <stop offset="100%" stopColor="#2A9D9F" />
              </linearGradient>
              <linearGradient id="purple-gradient" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8952A5" />
                <stop offset="100%" stopColor="#6B3B83" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
}