"use client";

import Image from "next/image";

/**
 * LogoMark — Pyrexx AI brand mark
 * Renders the official /public/PyrexxAI_logo.png at the requested size.
 * Used in the dashboard header (beside the "Pyrexx AI" wordmark) and
 * is also referenced as the favicon / app icon via layout.tsx metadata.
 */
interface LogoMarkProps {
  size?: number;
  className?: string;
}

export default function LogoMark({ size = 36, className = "" }: LogoMarkProps) {
  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/PyrexxAI_logo.png"
        alt="Pyrexx AI logo"
        fill
        sizes={`${size}px`}
        className="object-contain"
        priority
      />
    </div>
  );
}
