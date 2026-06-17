import LogoMark from "@/components/LogoMark";
import AdminSignOutButton from "@/components/admin/AdminSignOutButton";

export const metadata = { title: "Admin | Pyrexx AI" };

/**
 * Admin shell — wraps every /admin/* page.
 * Access control happens in src/middleware.ts (role === 'admin'),
 * so this layout assumes the user is already verified.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen dashboard-bg">
      <header
        className="sticky top-0 z-30 px-4 md:px-8 py-3 flex items-center gap-3"
        style={{
          background: "var(--bg-base)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <a href="/admin" className="flex items-center gap-2.5 flex-shrink-0">
          <LogoMark size={32} />
          <div>
            <h1 className="text-sm font-extrabold leading-tight" style={{ color: "var(--text-primary)" }}>
              <span style={{ color: "var(--teal)" }}>Pyrexx</span> Admin
            </h1>
            <p className="text-[10px] hidden sm:block leading-tight" style={{ color: "var(--text-muted)" }}>
              Agency control panel
            </p>
          </div>
        </a>
        <div className="flex-1" />
        <AdminSignOutButton />
      </header>
      <main className="px-4 md:px-8 py-6">{children}</main>
    </div>
  );
}