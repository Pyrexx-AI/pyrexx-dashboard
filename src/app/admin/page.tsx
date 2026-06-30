import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ClientSetupForm from "@/components/admin/ClientSetupForm";

export const metadata = { title: "Client Setup | Pyrexx Admin" };

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: clinic } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", id)
    .single();

  if (!clinic) notFound();

  // Integration credentials are admin-only (RLS enforces this), so
  // this select is safe — but only ever surface them on this admin
  // page, never pass them to a client-facing component/route.
  const { data: credentials } = await supabase
    .from("integration_credentials")
    .select("*")
    .eq("clinic_id", id);

  const crmCredential = credentials?.find((c) => c.provider === "crm") ?? null;

  return (
    <div className="flex flex-col gap-5 max-w-3xl mx-auto">
      <Link href="/admin" className="flex items-center gap-1.5 text-xs font-semibold w-fit" style={{ color: "var(--text-muted)" }}>
        <ArrowLeft size={13} aria-hidden="true" /> Back to clients
      </Link>

      <ClientSetupForm clinic={clinic} crmCredential={crmCredential} />
    </div>
  );
}