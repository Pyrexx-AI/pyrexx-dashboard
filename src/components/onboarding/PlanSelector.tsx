"use client";

import { motion } from "framer-motion";
import { Check, Moon, PhoneCall } from "lucide-react";
import { SELECTABLE_PLANS } from "@/lib/plans";
import type { PlanTier } from "@/types/database";

interface PlanSelectorProps {
  selected: PlanTier | "";
  onSelect: (tier: PlanTier) => void;
}

const ICONS: Partial<Record<PlanTier, React.ElementType>> = {
  overflow: Moon,
  full_time: PhoneCall,
};

export default function PlanSelector({ selected, onSelect }: PlanSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Choose a plan">
      {SELECTABLE_PLANS.map((plan) => {
        const Icon = ICONS[plan.tier] || PhoneCall;
        const isSelected = selected === plan.tier;
        return (
          <motion.button
            key={plan.tier}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(plan.tier)}
            whileTap={{ scale: 0.98 }}
            className="text-left p-4 rounded-2xl cursor-pointer transition-colors flex flex-col gap-3"
            style={{
              background: isSelected ? "var(--teal-surface)" : "var(--bg-sunken)",
              border: `1.5px solid ${isSelected ? "var(--teal)" : "var(--border-subtle)"}`,
            }}
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: isSelected ? "var(--teal)" : "var(--bg-card)" }}>
                <Icon size={16} style={{ color: isSelected ? "#fff" : "var(--text-muted)" }} aria-hidden="true" />
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--teal)" }}>
                  <Check size={12} style={{ color: "#fff" }} aria-hidden="true" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{plan.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{plan.tagline}</p>
            </div>
            <p className="text-lg font-extrabold" style={{ color: isSelected ? "var(--teal-text)" : "var(--text-primary)" }}>
              {plan.priceLabel}
            </p>
            <ul className="space-y-1.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  <Check size={11} className="flex-shrink-0 mt-0.5" style={{ color: "var(--teal)" }} aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </motion.button>
        );
      })}
    </div>
  );
}