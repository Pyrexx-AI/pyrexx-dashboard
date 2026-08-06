"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Prevent hydration mismatch by rendering a placeholder of the exact same size
  if (!mounted) {
    return <div className="theme-toggle-pill w-[100px] h-[32px] opacity-0" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="theme-toggle-pill flex-shrink-0" role="group" aria-label="Color theme">
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-label="Light mode"
        aria-pressed={!isDark}
        className={`theme-toggle-btn${!isDark ? " active" : ""}`}
      >
        <Sun size={14} aria-hidden="true" />
        <span className="hidden sm:inline">Light</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-label="Dark mode"
        aria-pressed={isDark}
        className={`theme-toggle-btn${isDark ? " active" : ""}`}
      >
        <Moon size={14} aria-hidden="true" />
        <span className="hidden sm:inline">Dark</span>
      </button>
    </div>
  );
}