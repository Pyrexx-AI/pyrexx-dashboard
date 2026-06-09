"use client";

import { motion } from "framer-motion";

export default function LoadingAnimation() {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white"
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0,
        scale: 50, // Massive zoom into the center of the X
        transition: { duration: 0.8, ease: "easeInOut" } 
      }}
    >
      <div className="relative flex items-center justify-center">
        {/* Glowing backdrop circle rotating clockwise */}
        <motion.div
          className="absolute w-40 h-40 rounded-full blur-2xl opacity-50"
          animate={{
            background: [
              "conic-gradient(from 0deg, #AEC6CF, #FFD1BA, #AEC6CF)",
              "conic-gradient(from 360deg, #AEC6CF, #FFD1BA, #AEC6CF)"
            ]
          }}
          transition={{ duration: 1, repeat: 3, ease: "linear" }}
        />

        {/* The X Logo */}
        <motion.svg
          width="120"
          height="120"
          viewBox="0 0 100 100"
          className="relative z-10 drop-shadow-lg"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, ease: "easeInOut" }}
        >
          <motion.path
            d="M 20 20 L 80 80 M 80 20 L 20 80"
            stroke="#AEC6CF"
            strokeWidth="12"
            strokeLinecap="round"
            fill="transparent"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut", repeat: 1, repeatType: "reverse" }}
          />
          <motion.path
            d="M 20 20 L 80 80 M 80 20 L 20 80"
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
            fill="transparent"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, yoyo: Infinity }}
          />
        </motion.svg>
      </div>
    </motion.div>
  );
}