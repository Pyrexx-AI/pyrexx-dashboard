"use client";

import { motion } from "framer-motion";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string; // used for aria-label — every switch must be identifiable
  disabled?: boolean;
}

/**
 * Switch — accessible on/off toggle.
 * Used throughout the Profile page for notification preferences etc.
 * role="switch" + aria-checked per WAI-ARIA switch pattern.
 */
export default function Switch({ checked, onChange, label, disabled = false }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className="relative flex-shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-opacity"
      style={{
        width: 40,
        height: 24,
        borderRadius: 9999,
        background: checked ? "var(--teal)" : "var(--bg-sunken)",
        border: `1px solid ${checked ? "var(--teal)" : "var(--border-medium)"}`,
        transition: "background-color 0.2s ease, border-color 0.2s ease",
      }}
    >
      <motion.span
        className="absolute top-0.5 left-0.5 rounded-full"
        style={{ width: 18, height: 18, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }}
        animate={{ x: checked ? 16 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
      />
    </button>
  );
}
