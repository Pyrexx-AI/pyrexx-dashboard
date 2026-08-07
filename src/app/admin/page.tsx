import { createAdminClient } from "@/lib/supabase/server";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";
import type { Database } from "@/types/database";

export const metadata = { title: "Admin Dashboard | Pyrexx" };

type Clinic = Database["public"]["Tables"]["clinics"]["Row"];

export default async function AdminDashboardPage() {
  // Use Service Role client to bypass RLS failures on admin queries
  const supabase = createAdminClient();
  
  const { data: clinics, error } = await supabase
    .from("clinics")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin dashboard fetch error:", error);
  }

  const allClinics = (clinics ?? []) as Clinic[];

  // Metrics Calculation
  const activeClinics = allClinics.filter(c => c.subscription_status === 'active');
  const needsSetup = allClinics.filter(c => c.status === 'onboarding' || c.status === 'pending_setup');
  
  const mrrCents = activeClinics.reduce((acc, curr) => acc + (curr.plan_price_cents || 0), 0);
  const mrr = `$${(mrrCents / 100).toLocaleString()}`;

  return (
    <AdminDashboardClient 
      clinics={allClinics} 
      metrics={{ total: allClinics.length, active: activeClinics.length, needsSetup: needsSetup.length, mrr }}
    />
  );
}