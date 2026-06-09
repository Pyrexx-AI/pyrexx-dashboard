"use client";

import React from "react";
import { motion } from "framer-motion";

// Extend React's CSSProperties to accept our specific vendor prefixes
const swirlMaskStyle: React.CSSProperties & { WebkitMaskMode?: string; maskMode?: string } = {
  // Pyrexx brand colors alternating to create the "clockwise swap" illusion
  background: 'conic-gradient(from 0deg, #48C4C6 0%, #8952A5 25%, #48C4C6 50%, #8952A5 75%, #48C4C6 100%)',
  
  // Masking configuration pointing to your public asset
  maskImage: "url('/pyrexx-mask.svg')",
  WebkitMaskImage: "url('/pyrexx-mask.svg')",
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskPosition: 'center',
  WebkitMaskPosition: 'center',
  
  // Enforce alpha channel masking
  maskMode: 'alpha',
  WebkitMaskMode: 'alpha',
};

export default function LoadingAnimation() {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white dark:bg-pyrexx-darkBg"
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0,
        scale: 150, // Massive 150x scale creates the "zoom through the center" effect
        transition: { duration: 0.9, ease: "easeInOut" } 
      }}
    >
      {/* Wrapper to control overall logo size and alignment */}
      <div className="relative w-64 h-64 flex items-center justify-center">
        
        {/* Soft background glow mimicking the rotation */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
          className="absolute w-40 h-40 bg-pyrexx-purple rounded-full blur-[40px] z-0"
        />

        {/* THE COLOR SWIRL LAYER (Masked by the Pyrexx Logo) */}
        <div 
          className="relative z-10 w-56 h-56 animate-swirl-clockwise drop-shadow-xl"
          style={swirlMaskStyle}
        />
      </div>
    </motion.div>
  );
}