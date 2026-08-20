import React from "react";
import LegalDocManager from "@/components/admin/LegalDocManager";

export const metadata = { title: "Legal Document Management | Pyrexx Admin" };

export default function AdminLegalPage() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Legal Agreement Management
        </h1>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Manage and upload client agreements (PDF, DOCX, TXT) rendered during the onboarding wizard.
        </p>
      </div>

      <LegalDocManager />
    </div>
  );
}