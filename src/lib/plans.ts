/**
 * Pricing Tiers — Single Source of Truth
 * ───────────────────────────────────────────────────────────────
 * Referenced by OnboardingWizard (plan selection step), ProfilePanel
 * (subscription display), and the Dodo checkout route (resolving
 * which Dodo product ID to charge). Keeping this in one place means
 * a price change is a one-line edit, not a hunt across components.
 *
 * `dodoProductIdEnvVar` points at the env var holding that tier's
 * Dodo product ID — see .env.example. Each tier is a distinct Dodo
 * product (not variable pricing on one product), since Dodo's
 * checkout model is product-based.
 */
import type { PlanTier } from "@/types/database";

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  priceCents: number;
  priceLabel: string;
  tagline: string;
  features: string[];
  dodoProductIdEnvVar: string;
  /** Shown in the admin/UI; false hides it from the onboarding selector entirely. */
  available: boolean;
}

export const PLANS: Record<Exclude<PlanTier, "usage_based">, PlanDefinition> & {
  usage_based: PlanDefinition;
} = {
  overflow: {
    tier: "overflow",
    name: "Overflow AI Receptionist",
    priceCents: 100000,
    priceLabel: "$1,000/mo",
    tagline: "Covers after-hours & weekends",
    features: [
      "Answers calls outside business hours",
      "Handles weekend overflow",
      "Books appointments into your CRM",
      "Full call transcripts & analytics",
    ],
    dodoProductIdEnvVar: "DODO_PRODUCT_ID_OVERFLOW",
    available: true,
  },
  full_time: {
    tier: "full_time",
    name: "Full Time Receptionist",
    priceCents: 150000,
    priceLabel: "$1,500/mo",
    tagline: "Handles every inbound call",
    features: [
      "Answers 100% of inbound calls",
      "Replaces or backs up your front desk",
      "Books appointments into your CRM",
      "Full call transcripts & analytics",
      "Priority support",
    ],
    dodoProductIdEnvVar: "DODO_PRODUCT_ID_FULLTIME",
    available: true,
  },
  usage_based: {
    tier: "usage_based",
    name: "Usage Based Agent",
    priceCents: 0,
    priceLabel: "Coming soon",
    tagline: "Pay only for the minutes you use",
    features: [],
    dodoProductIdEnvVar: "DODO_PRODUCT_ID_USAGE_BASED",
    available: false, // not yet sold — excluded from the onboarding selector
  },
};

export const SELECTABLE_PLANS: PlanDefinition[] = Object.values(PLANS).filter(
  (p) => p.available
);

export function getPlan(tier: PlanTier): PlanDefinition {
  return PLANS[tier];
}