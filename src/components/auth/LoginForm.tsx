"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isWhitelistedAdminEmail } from "@/lib/auth/admin-client";
import LogoMark from "@/components/LogoMark";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryEmail = searchParams.get("email") || "";
  const reason = searchParams.get("reason");

  const [email, setEmail] = useState(queryEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Unable to authenticate user session.");
      setLoading(false);
      return;
    }

    // Determine admin status using verified whitelist + token metadata + profile role
    const isEmailAdmin = isWhitelistedAdminEmail(data.user.email);
    const isMetadataAdmin =
      data.user.app_metadata?.role === "admin" ||
      data.user.user_metadata?.role === "admin";

    let isDbAdmin = false;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      isDbAdmin = profile?.role === "admin";
    } catch {
      // Non-fatal if DB query fails during login navigation
    }

    const isAdmin = isEmailAdmin || isMetadataAdmin || isDbAdmin;
    const redirectParam = searchParams.get("redirect");

    if (isAdmin) {
      router.push(redirectParam?.startsWith("/admin") ? redirectParam : "/admin");
    } else {
      router.push(redirectParam || "/");
    }
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-base)" }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="card w-full max-w-sm p-6 md:p-8 flex flex-col gap-6"
      >
        <div className="flex flex-col items-center gap-3">
          <LogoMark size={48} />
          <div className="text-center">
            <h1 className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>
              <span style={{ color: "var(--teal)" }}>Pyrexx</span> AI
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Sign in to your dashboard
            </p>
          </div>
        </div>

        {reason === "exists" && (
          <div
            className="flex items-start gap-2.5 p-3 rounded-xl text-xs leading-relaxed"
            style={{
              background: "var(--info-surface)",
              color: "var(--info-text)",
              border: "1px solid rgba(29, 78, 216, 0.2)",
            }}
            role="status"
          >
            <Info size={15} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              An account with this email already exists. Enter your password below to sign in.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Email
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none transition-colors"
                style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                placeholder="you@clinic.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus={Boolean(queryEmail)}
                className="w-full pl-9 py-2.5 rounded-xl text-sm outline-none transition-colors"
                style={{ paddingRight: "2.5rem", background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors"
                style={{ color: "var(--text-muted)" }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: "var(--error-surface)", color: "var(--error-text)" }} role="alert">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"
            style={{ background: "var(--teal)", color: "#fff" }}
          >
            {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
          New clinic?{" "}
          <a href="/signup" className="font-semibold" style={{ color: "var(--teal-text)" }}>
            Get started
          </a>
        </p>
      </motion.div>
    </div>
  );
}