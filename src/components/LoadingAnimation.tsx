"use client";

import React, { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";

/*
  LoadingAnimation — Pyrexx AI
  ─────────────────────────────────────────────────────────────────
  REDESIGN NOTES

  1. UNIFORM BACKGROUND
     Previously the logo sat inside a cream (#fafaf7) rounded badge,
     which created a hard color seam against the dark (#160B24)
     screen. That badge is removed entirely. The logo's own paths
     are recolored so they render directly and seamlessly on the
     page background:
       • Dark border path (was #414140) → recolored to the exact
         page background (#160B24). It becomes invisible, so there
         is no separate "frame" around the logo — just the colored
         ribbons and a soft light silhouette floating on one
         continuous background.
       • White inner-gap / separator paths (was #fafaf7) → recolored
         to a soft near-white (#F4F1FA) so the mark still reads with
         depth and definition against the dark backdrop.
       • Ribbons recolored to the brand tokens (#48C4C6 teal /
         #8952A5 purple) used throughout the dashboard.

  2. PHASE 1 ↔ PHASE 2 (COLOR INVERSION VIA 180° ROTATION)
     The logo mark has 180° rotational symmetry: rotating the whole
     glyph by 180° lands every shape exactly on top of where its
     "opposite" shape was. Because the two ribbons occupy those
     opposite shapes, a 180° rotation makes teal and purple swap
     places — i.e. "the colors invert" — while the overall silhouette
     is unchanged.
       • Phase 1 = 0°  (teal left-X / purple right-X — matches the
         real static logo)
       • Phase 2 = 180° (purple left-X / teal right-X — inverted)
     During loading, the mark continuously oscillates 0° → 180° → 0°,
     smoothly cycling between phase 1 and phase 2 — a clear "alive,
     processing" signal.

  3. ZOOM TO CENTER ON EXIT
     When loading completes, AnimatePresence triggers the exit
     animation: the whole mark scales up dramatically while fading
     out, as if the viewer is zooming through it into the dashboard.

  4. REDUCED MOTION
     The 0↔180 oscillation and the large exit zoom are both disabled.
     The mark stays static at phase 1 and simply fades out.
*/

const CONTAINER_SIZE = 152; // px

export default function LoadingAnimation() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Outer wrapper: handles entrance + exit (zoom-to-center)
  const wrapperVariants: Variants = {
    initial: { opacity: 0, scale: 0.78 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: "easeOut" } },
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: "#160B24" }}
      initial={{ opacity: 1 }}
      exit={
        reducedMotion
          ? { opacity: 0, transition: { duration: 0.18 } }
          : { opacity: 0, transition: { duration: 0.55, ease: [0.6, 0, 0.4, 1] } }
      }
      aria-live="polite"
      aria-label="Loading Pyrexx AI dashboard"
    >
      {/* Subtle ambient glow — same palette as the mark, low opacity, doesn't
          break the "single background" requirement, just adds atmosphere */}
      {!reducedMotion && (
        <motion.div
          className="absolute rounded-full blur-3xl pointer-events-none"
          style={{
            width: 360,
            height: 360,
            background:
              "radial-gradient(circle, rgba(72,196,198,0.10) 0%, rgba(137,82,165,0.08) 55%, transparent 100%)",
          }}
          animate={{ scale: [0.94, 1.05, 0.94], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Entrance + exit (zoom to center) */}
      <motion.div
        className="relative z-10"
        style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}
        variants={wrapperVariants}
        initial="initial"
        animate="show"
        exit={
          reducedMotion
            ? { opacity: 0, scale: 0.9, transition: { duration: 0.18 } }
            : {
                opacity: 0,
                scale: 12,
                transition: { duration: 0.6, ease: [0.6, 0, 0.4, 1] },
              }
        }
      >
        {/* Continuous phase 1 <-> phase 2 oscillation (180° = color swap) */}
        <motion.div
          style={{ width: "100%", height: "100%" }}
          animate={reducedMotion ? { rotate: 0 } : { rotate: [0, 180, 360] }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : {
                  duration: 2.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  times: [0, 0.5, 1],
                }
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="350 230 980 940"
            style={{ width: "100%", height: "100%", display: "block" }}
            aria-hidden="true"
          >
            {/* Dark outer silhouette — recolored to match the page
                background exactly, so no separate "frame" is visible */}
            <path
              fill="#160B24"
              d="M836.21 337.887a219.73 219.73 0 0 1 129.457-85.022c32.011-7.352 64.868-5.602 97.625-5.58l94.624.007 57.118.01c11.38-.002 26.054-.484 37.018.903a81.9 81.9 0 0 1 33.63 12 88.17 88.17 0 0 1 38.943 55.211 88.16 88.16 0 0 1-4.793 53.945c-6.147 14.256-16.924 28.21-25.967 40.984l-30.093 42.402-110.373 154.283c-16.633 23.29-39.772 53.829-54.806 77.518 13.405 20.807 35.716 49.818 50.798 70.793l107.814 149.612 32.107 44.736c12.395 17.3 31.43 41.056 36.932 61.127a95.74 95.74 0 0 1-8.967 72.33c-14.166 24.797-34.036 37.799-60.927 45.271-19.028 3.96-43.32 2.822-63.249 2.803l-77.713-.015-80.48.039c-16.285.004-35.703.647-51.646-.989-61.53-6.319-108.514-33.915-147.313-80.997-32.752 39.58-67.926 64.205-118.752 76.342-31.696 7.568-64.647 5.635-97.312 5.614l-91.001-.024-60.642.1c-30.348.059-55.134 1.538-82.15-15.442a93.23 93.23 0 0 1-41.357-59.836 90.35 90.35 0 0 1 5.26-55.468c6.68-15.33 17.725-29.465 27.504-43.083l32.071-44.649 108.533-151.04c16.728-23.302 39.96-53.693 55.178-77.415-3.325-6.241-12.11-18.006-16.393-24.001l-27.954-39.21-116.542-162.975-34.76-48.678c-7.048-9.892-17.061-23.195-22.587-33.676a83.4 83.4 0 0 1-9.481-31.123 88.57 88.57 0 0 1 19.545-65.064c15.434-18.8 35.089-29.5 59.207-31.964 6.058-.814 24.078-.417 31.039-.41l60.7.074 101.092-.056c22.552-.01 49.558-.97 71.476 2.234 61.274 8.963 110.426 39.565 147.587 88.379"
            />

            {/* White inner gap — recolored to a soft off-white so the
                mark keeps depth/definition against the dark backdrop */}
            <path
              fill="#F4F1FA"
              d="M434.35 271.297c13.899-.664 32.95-.172 47.277-.191l96.61.03 66.284-.135c15.548-.027 31.626-.54 46.615 1.21 52.82 6.164 98.692 35.468 127.286 80.066 4.78 7.455 11.969 16.453 17.586 23.572 10.523-12.475 20.612-28.94 31.358-42.055 25.938-31.654 63.499-53.035 103.683-60.153 20.577-3.645 47.478-2.594 68.832-2.57l92.826.046 70.48-.023c24.747-.001 51.31-3.075 72.326 11.963a62.92 62.92 0 0 1 25.486 41.658 64.88 64.88 0 0 1-6.274 39.654c-4.87 9.664-19.68 29.604-26.32 38.904l-46.745 65.407c-51.008 71.266-102.08 144.582-154.026 214.995 5.694 8.82 13.625 19.028 19.917 27.788l40.272 56.015 110.758 154.245 33.833 47.072c6.931 9.64 14.432 19.286 20.553 29.412 27.775 45.944 3.415 96.043-47.317 106.472-10.644 1.619-29.52 1.128-40.947 1.133l-65.489-.009-96.346.052c-22.425.004-49.016 1.026-70.62-2.566a182.97 182.97 0 0 1-110.21-62.017c-9.166-10.55-17.952-23.378-26.153-34.872-8.866 11.574-15.916 23.162-25.633 34.651a182.1 182.1 0 0 1-106.155 61.6c-22.66 4.208-52.328 3.197-75.948 3.192l-97.293-.004-64.44-.018c-25.413-.019-47.156 2.516-69.267-12.85a68.33 68.33 0 0 1-28.242-44.746c-5.913-34.25 13.999-55.848 32.605-81.625a5941 5941 0 0 0 38.272-53.512l164.538-229.232c-49.025-66.792-97.324-136.103-145.618-203.589l-49.625-69.314c-14.788-20.64-37.401-46.683-38.957-72.462a63.45 63.45 0 0 1 16.272-45.92c13.437-14.992 28.505-20.177 47.956-21.274"
            />

            {/* Right-X ribbon — purple (phase 1) */}
            <path
              fill="#8952A5"
              d="M836.268 393.402c15.756-22.893 35.525-53.401 55.984-71.277a155 155 0 0 1 69.074-34.438c25.07-5.549 52.075-4.412 77.816-4.446l77.698.049 62.49-.067c15.515-.091 33.096-.48 48.491.586 16.873-.25 28.963 1.179 41.785 13.646a49.07 49.07 0 0 1 14.836 34.913c.089 20.628-13.381 35.299-24.792 51.405l-31.293 44.129L1102.023 605.1l-36.173 50.637c-5.128 7.173-15.393 20.808-19.457 27.918 17.591 26.064 37.953 53.364 56.309 79.151l110.48 154.922 43.762 61.626c6.685 9.41 19.113 25.54 23.856 34.942a49.5 49.5 0 0 1 4.3 31.675 51.2 51.2 0 0 1-21.617 32.784c-16.636 11-36.578 8.702-55.652 8.62l-54.466-.142-102.199.063c-26.759.026-57.626 1.763-83.27-3.853-72.219-15.814-93.287-55.944-131.973-108.3-2.725 3.773-8.907 12.855-11.695 15.949l-.713 1.2c-29.33 44.96-61.153 78.494-115.67 90.543-28.278 6.25-58.18 4.53-87.042 4.507l-94.857-.042-58.734.1c-20.203.065-40.897 2.497-58.551-8.755-19.563-12.469-28.122-40.919-18.222-61.915 5.295-11.23 15.176-23.876 22.452-34.186l39.854-56.03L563.48 770.541c19.131-26.864 43.733-59.243 61.364-86.42-4.028-7.371-13.147-19.678-18.193-26.858a6418 6418 0 0 0-38.708-54.166L444.222 428.644l-32.103-45.46c-11.115-15.759-24.394-30.539-24.388-50.804a48.52 48.52 0 0 1 15.272-35.04c12.295-11.715 26.151-14.236 42.53-13.968 66.047-.838 132.282.384 198.348-.12 23.366-.18 47.354-.671 70.143 5.01a159.17 159.17 0 0 1 72.708 40.407c15.222 14.821 24.59 29.638 36.555 46.795 2.965 4.25 9.758 14.347 12.981 17.938"
            />

            {/* Left-X ribbon — teal (phase 1) */}
            <path
              fill="#48C4C6"
              d="M624.844 684.121c-4.028-7.371-13.147-19.678-18.193-26.858a6418 6418 0 0 0-38.708-54.166L444.222 428.644l-32.103-45.46c-11.115-15.759-24.394-30.539-24.388-50.804a48.52 48.52 0 0 1 15.272-35.04c12.295-11.715 26.151-14.236 42.53-13.968l.494 1.086c22.83 4.609 35.412 26.503 47.528 44.043a2474 2474 0 0 0 20.657 29.58c2.506 3.52 8.935 12.913 11.861 15.657 33.701.805 67.77-.083 101.329.273 34.111.363 65.419-5.597 90.744 22.698 11.335 12.666 19.833 27.177 30.034 40.712 6.612 9.457 22.546 29.34 27.658 38.523a8252 8252 0 0 1 60.443 84.376 7490 7490 0 0 0 58.178 81.616c7.068 9.884 23.99 32.406 29.348 41.995-8.235 13.362-22.015 31.42-31.596 44.748l-56.846 79.001c8.344 12.804 22.845 30.971 29.633 43.11l-.608-.092c-2.03-2.749-4.44-5.75-6.003-8.744-4.748-.257-10.351 3.777-14.741 5.472-23.469 9.052-41.436 30.69-64.217 40.779-2.942 4.8 1.944 10.776 4.714 15.002-1.919-2.512-6.774-9.256-8.623-11.25-5.863 8.278-13.437 18.405-18.75 26.815-.347 3.852-2.097 5.62-4.345 8.832 13.171 17.666 31.054 35.995 44.572 53.89 5.057 6.695 11.327 12.767 15.737 20.013l1.371.419c4.858-3.168 5.679-10.128 10.123-10.833l-.713 1.2c-29.33 44.96-61.153 78.494-115.67 90.543-28.278 6.25-58.18 4.53-87.042 4.507l-94.857-.042-58.734.1c-20.203.065-40.897 2.497-58.551-8.755-19.563-12.469-28.122-40.919-18.222-61.915 5.295-11.23 15.176-23.876 22.452-34.186l39.854-56.03L563.48 770.541c19.131-26.864 43.733-59.243 61.364-86.42"
            />

            {/* Top-center bridge — teal (matches left-X ribbon) */}
            <path
              fill="#48C4C6"
              transform="scale(1.2648 1.26432)"
              d="M661.186 311.157c12.457-18.107 28.087-42.237 44.263-56.376a122.53 122.53 0 0 1 54.613-27.238c19.821-4.389 41.172-3.49 61.524-3.517l61.431.039 49.407-.053c12.267-.072 26.167-.379 38.339.464-23.831 8.737-27.923 19.761-42.036 39.757l-22.719 31.81c-5.712-1.503-110.719-.771-119.26.327a49.7 49.7 0 0 0-18.79 6.542 64.4 64.4 0 0 0-14.811 12.034c-5.834 6.335-11.301 14.987-16.384 22.047-9.205 12.787-18.372 26.727-28.02 39.158-16.207-19.535-30.43-47-47.557-64.994"
            />

            {/* White interlocking separators — recolored to match the
                inner-gap tone, preserve the over/under ribbon weave */}
            <path fill="#F4F1FA" d="M686.11 768.27c7.46 9.393 15.831 21.657 22.927 31.524l40.25 56.209c6.766 9.545 19.04 28.02 26.233 35.953-5.863 8.279-13.437 18.406-18.75 26.816-14.239 16.662-24.704 37.6-40.015 53.763-28.998 30.61-68.327 25.064-106.661 25.03l-88.078.09 106.109-149.079 35.554-50.014c6.737-9.427 15.109-21.713 22.43-30.293"/>
            <path fill="#F4F1FA" d="M526.073 373.738c33.701.805 67.77-.083 101.329.273 34.111.363 65.419-5.597 90.744 22.698 11.335 12.666 19.833 27.177 30.034 40.712 6.612 9.457 22.546 29.34 27.658 38.523-8.99 10.518-22.49 30.377-30.819 41.966l-58.617 81.704c-51.907-71.05-101.548-144.083-153.38-215.211-1.956-2.685-5.933-7.747-6.949-10.665"/>
            <path fill="#F4F1FA" d="M836.28 560.32a7490 7490 0 0 0 58.179 81.616c7.068 9.884 23.99 32.406 29.348 41.995-8.235 13.362-22.015 31.42-31.596 44.748l-56.846 79.001-87.677-123.46c4.831-8.819 23.963-34.552 30.495-43.507 19.142-26.236 38.419-54.875 58.098-80.393"/>
            <path fill="#F4F1FA" d="M896.418 475.575c12.203-15.717 23.797-33.341 35.44-49.508 6.429-8.926 13.344-19.865 20.722-27.874a81.5 81.5 0 0 1 18.733-15.215 62.9 62.9 0 0 1 23.766-8.271c10.803-1.389 143.615-2.314 150.84-.414L1042.332 519.77c-17.793 24.907-38.49 55.676-56.89 79.614-11.999-15.396-24.03-33.023-35.446-49.02z"/>
            <path fill="#F4F1FA" d="M985.449 768.603c4.013 3 25.026 33.64 29.487 40.018 44.25 63.267 90.196 125.546 134.27 188.906l-90.437-.011c-25.78.083-53.6 2.858-77.659-7.297-24.281-10.248-35.348-29.367-50.049-49.705-11.578-16.017-23.089-32.792-35.279-48.35 8.029-9.198 17.793-24.536 25.462-34.7 21.45-28.427 42.248-61.118 64.205-88.861"/>
          </svg>
        </motion.div>
      </motion.div>

      {/* Brand wordmark */}
      <motion.p
        className="relative z-10 mt-7 text-[11px] font-semibold tracking-[0.22em] uppercase"
        style={{ color: "rgba(255,255,255,0.34)" }}
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.45, ease: "easeOut" }}
        aria-hidden="true"
      >
        Pyrexx AI
      </motion.p>
    </motion.div>
  );
}
