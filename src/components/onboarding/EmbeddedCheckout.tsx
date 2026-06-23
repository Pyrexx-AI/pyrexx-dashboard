"use client";

/**
 * EmbeddedCheckout
 * ───────────────────────────────────────────────────────────────
 * Mounts Dodo's checkout INLINE inside the onboarding wizard, rather
 * than redirecting away to a hosted page. Uses the `dodopayments-checkout`
 * npm package (separate from the server-side `dodopayments` SDK) —
 * verified directly against its installed type definitions:
 *
 *   DodoPayments.Initialize({ mode, displayType, onEvent })
 *   DodoPayments.Checkout.open({ checkoutUrl, elementId, options })
 *
 * IMPORTANT — there is no confirmed "checkout.success" event in this
 * SDK. Dodo's own guidance (and ours, accordingly) is to never gate
 * dashboard access purely on a frontend event — the webhook handler
 * (api/webhooks/dodo/route.ts) is the actual source of truth for
 * "did this subscription activate", since it's server-to-server and
 * can't be spoofed or missed by a closed tab. This component's job
 * is purely to advance the wizard's UI step when the checkout iframe
 * closes — NOT to claim the payment succeeded.
 */
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface EmbeddedCheckoutProps {
  checkoutUrl: string;
  onClosed: () => void;
}

export default function EmbeddedCheckout({ checkoutUrl, onClosed }: EmbeddedCheckoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementId = "dodo-checkout-inline";
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function mount() {
      try {
        const { DodoPayments } = await import("dodopayments-checkout");

        DodoPayments.Initialize({
          mode: process.env.NEXT_PUBLIC_DODO_MODE === "live" ? "live" : "test",
          displayType: "inline",
          onEvent: (event) => {
            if (event.event_type === "checkout.closed") {
              onClosed();
            }
            if (event.event_type === "checkout.error") {
              setSdkError("Something went wrong loading payment. Please try again.");
            }
          },
        });

        if (cancelled) return;

        DodoPayments.Checkout.open({
          checkoutUrl,
          elementId,
        });

        setSdkReady(true);
      } catch (err) {
        console.error("Failed to load Dodo checkout SDK:", err);
        if (!cancelled) setSdkError("Could not load the payment form. Please refresh and try again.");
      }
    }

    mount();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutUrl]);

  if (sdkError) {
    return (
      <div className="rounded-xl p-4 text-sm" style={{ background: "var(--error-surface)", color: "var(--error-text)" }} role="alert">
        {sdkError}
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ minHeight: 420 }}>
      {!sdkReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Loader2 size={22} className="animate-spin" style={{ color: "var(--teal)" }} aria-hidden="true" />
          <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Loading secure payment form…</p>
        </div>
      )}
      <div id={elementId} ref={containerRef} className="w-full" style={{ minHeight: 420 }} />
    </div>
  );
}