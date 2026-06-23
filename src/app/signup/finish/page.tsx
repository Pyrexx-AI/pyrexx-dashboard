import { Suspense } from "react";
import FinishClient from "./FinishClient";

export const metadata = { title: "Finish Signup | Pyrexx AI" };

/**
 * /signup/finish?clinicId=...
 * ───────────────────────────────────────────────────────────────
 * REDIRECT-FALLBACK landing page. In the normal/happy path, payment
 * happens inline (EmbeddedCheckout.tsx) and the wizard advances to
 * its own internal Account step via the `checkout.closed` JS event —
 * the user never navigates away from /signup at all.
 *
 * This standalone page exists for the edge case where Dodo's
 * checkout does a real top-level redirect instead of staying in the
 * iframe (some payment methods, e.g. certain bank-redirect flows,
 * genuinely can't complete inside an iframe). `return_url` in
 * api/onboarding/checkout/route.ts points here as that fallback
 * target, with clinicId carried in the query string so this page can
 * pick up exactly where the wizard left off — same final step
 * (create password), same API call.
 */
export default function FinishPage() {
  return (
    <Suspense fallback={null}>
      <FinishClient />
    </Suspense>
  );
}