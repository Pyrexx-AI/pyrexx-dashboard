import LogoMark from "@/components/LogoMark";
import AdminSignOutButton from "@/components/admin/AdminSignOutButton";
import ThemeToggle from "@/components/ui/ThemeToggle";

export const metadata = { title: "Admin | Pyrexx AI" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen dashboard-bg transition-colors duration-500">
      <header
        className="sticky top-0 z-30 px-4 md:px-8 py-3 md:py-4 flex items-center gap-3"
        style={{
          background: "rgba(var(--bg-base-rgb, 248, 250, 252), 0.8)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <a href="/admin" className="flex items-center gap-2.5 flex-shrink-0">
          <LogoMark size={36} />
          <div>
            <h1 className="text-base md:text-lg font-extrabold leading-tight tracking-tight" style={{ color: "var(--text-primary)" }}>
              <span style={{ color: "var(--teal)" }}>Pyrexx</span> Admin
            </h1>
            <p className="text-[10px] hidden sm:block font-medium leading-tight" style={{ color: "var(--text-muted)" }}>
              Command Center
            </p>
          </div>
        </a>
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="w-px h-5" style={{ background: "var(--border-medium)" }} />
          <AdminSignOutButton />
        </div>
      </header>
      <main className="px-4 md:px-8 py-6 max-w-6xl mx-auto">{children}</main>
    </div>
  );
}