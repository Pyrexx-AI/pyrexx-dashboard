import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { verifyAdminStatus } from "@/lib/auth/admin";
import DashboardHome from "@/components/DashboardHome";

export const metadata = {
  title: "Client Dashboard | Pyrexx AI",
  description: "Monitor live call activity, bookings, and AI receptionist performance.",
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const previewClinicId = typeof params.previewClinicId === "string" ? params.previewClinicId : undefined;
  const tab = typeof params.tab === "string" ? params.tab : "dashboard";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = await verifyAdminStatus(user);

  // If an Admin visits `/` without inspecting a clinic, redirect to Command Center
  if (isAdmin && !previewClinicId) {
    redirect("/admin");
  }

  let clinicId: string | undefined = undefined;
  let clinicName: string | undefined = undefined;
  let isInspectionMode = false;

  if (isAdmin && previewClinicId) {
    // Admin is actively inspecting a tenant dashboard
    isInspectionMode = true;
    clinicId = previewClinicId;

    const { data: inspectedClinic } = await supabase
      .from("clinics")
      .select("name")
      .eq("id", previewClinicId)
      .single();

    clinicName = inspectedClinic?.name || "Inspected Clinic";
  } else {
    // Standard clinic user (owner/staff): look up their assigned clinic_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id, role, full_name")
      .eq("id", user.id)
      .single();

    if (profile?.clinic_id) {
      clinicId = profile.clinic_id;

      const { data: clinic } = await supabase
        .from("clinics")
        .select("name")
        .eq("id", profile.clinic_id)
        .single();

      clinicName = clinic?.name || profile.full_name || "My Clinic";
    }
  }

  return (
    <main className="relative min-h-screen">
      <Suspense fallback={null}>
        <DashboardHome
          initialClinicId={clinicId}
          isAdmin={isAdmin}
          isInspectionMode={isInspectionMode}
          previewClinicId={previewClinicId}
          clinicName={clinicName}
          userEmail={user.email || ""}
          initialTab={tab}
        />
      </Suspense>
    </main>
  );
}