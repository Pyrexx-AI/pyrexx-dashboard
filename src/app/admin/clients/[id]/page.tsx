import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ClientSetupForm from "@/components/admin/ClientSetupForm";

export const metadata = { title: "Client Setup | Pyrexx Admin" };

/**
 * DATA ACCESS NOTE:
 * Uses the SERVICE ROLE client (bypasses RLS), matching
 * /admin/page.tsx's "Use Service Role client to bypass RLS failures
 * on admin queries" approach. This page previously used the regular
 * RLS-scoped client while the admin list page used the service-role
 * client for the identical `clinics` table — that inconsistency
 * meant this page could 404 for a legitimate, already-verified admin
 * whenever RLS policies didn't grant SELECT the way the list page's
 * workaround assumed.
 *
 * This is safe here specifically because admin/layout.tsx (the
 * parent layout for every /admin/* route) already calls
 * verifyAdminStatus() server-side and redirects non-admins to `/`
 * before this page's body ever runs — so by the time we get here,
 * the caller is a confirmed admin and the "AFTER verifying the
 * calling user's role === 'admin'" rule from
 * lib/supabase/server.ts's createAdminClient() doc comment is
 * satisfied by the layout, not by this file itself.
 */
export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", id)
    .single();

  if (clinicError || !clinic) notFound();

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