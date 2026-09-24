"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface EmbeddedCheckoutProps {
  checkoutUrl: string;
  onClosed: () => void;
  onError?: (errorMessage: string) => void;
}

export default function EmbeddedCheckout({ checkoutUrl, onClosed, onError }: EmbeddedCheckoutProps) {
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
              const msg = "Something went wrong loading payment. You can complete setup and pay later.";
              setSdkError(msg);
              onError?.(msg);
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
        if (!cancelled) {
          const msg = "Could not load the payment form. You can proceed to create your account and pay later.";
          setSdkError(msg);
          onError?.(msg);
        }
      }
    }

    mount();
    return () => {
      cancelled = true;
    };
  }, [checkoutUrl, onClosed, onError]);

  if (sdkError) {
    return (
      <div
        className="rounded-xl p-4 text-xs leading-relaxed"
        style={{ background: "var(--warning-surface)", color: "var(--warning-text)" }}
        role="alert"
      >
        <p className="font-bold">Payment Form Notice</p>
        <p className="mt-1">{sdkError}</p>
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