"use client";

import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import LogoMark from "@/components/LogoMark";
import AccountStep from "@/components/onboarding/AccountStep";

export default function FinishClient() {
  const params = useSearchParams();
  const clinicId = params.get("clinicId");

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: "var(--bg-base)" }}>
      <div className="w-full max-w-md flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2.5">
          <LogoMark size={44} />
          <div className="text-center">
            <h1 className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>
              <span style={{ color: "var(--teal)" }}>Pyrexx</span> AI
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>One last step</p>
          </div>
        </div>

        <div className="card p-6 md:p-7">
          {clinicId ? (
            <AccountStep clinicId={clinicId} />
          ) : (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: "var(--error-surface)", color: "var(--error-text)" }} role="alert">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Missing setup link. If you just completed payment, check the confirmation email,
                or contact support to finish setting up your account.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}