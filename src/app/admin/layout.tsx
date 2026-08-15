import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import LogoMark from "@/components/LogoMark";
import AdminSignOutButton from "@/components/admin/AdminSignOutButton";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Link from "next/link";
import { Shield, Eye } from "lucide-react";

export const metadata = { title: "Admin Command Center | Pyrexx AI" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  // Server-side fail-safe role verification
  let isAdmin = user.user_metadata?.role === "admin" || user.app_metadata?.role === "admin";

  if (!isAdmin) {
    const adminDb = createAdminClient();
    const { data: profile } = await adminDb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") {
      isAdmin = true;
    }
  }

  // If user is definitely not an admin, bounce to client dashboard
  if (!isAdmin) {
    redirect("/");
  }

  return (
    <div className="min-h-screen dashboard-bg transition-colors duration-300">
      <header
        className="sticky top-0 z-30 px-4 md:px-8 py-3 md:py-4 flex items-center gap-3"
        style={{
          background: "rgba(var(--bg-base-rgb, 248, 250, 252), 0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <Link href="/admin" className="flex items-center gap-2.5 flex-shrink-0 group">
          <LogoMark size={36} />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base md:text-lg font-extrabold leading-tight tracking-tight" style={{ color: "var(--text-primary)" }}>
                <span style={{ color: "var(--teal)" }}>Pyrexx</span> Admin
              </h1>
              <span className="badge text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Shield size={10} /> Verified
              </span>
            </div>
            <p className="text-[10px] hidden sm:block font-medium leading-tight" style={{ color: "var(--text-muted)" }}>
              Command Center &amp; Provisioning Engine
            </p>
          </div>
        </Link>
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
            style={{ background: "var(--bg-sunken)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
            title="View default client dashboard view"
          >
            <Eye size={13} /> View Client App
          </Link>
          <ThemeToggle />
          <div className="w-px h-5" style={{ background: "var(--border-medium)" }} />
          <AdminSignOutButton />
        </div>
      </header>

      <main className="px-4 md:px-8 py-6 max-w-6xl mx-auto">{children}</main>
    </div>
  );
}