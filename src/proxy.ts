// src/proxy.ts
/**
 * Root Proxy (formerly Middleware) — Auth Gate + Role Routing
 * ───────────────────────────────────────────────────────────────
 * Runs on every request (except static assets — see `matcher`).
 *
 * RULES:
 *  1. Refresh the Supabase session (always — see updateSession).
 *  2. /login, /signup, /auth/* — public, no checks.
 *  3. Everything else requires a session → redirect to /login.
 *  4. /admin/* requires profiles.role === 'admin' → otherwise
 *     redirect to / (clinic dashboard).
 *  5. Authenticated clinic users (non-admin) hitting /admin/* are
 *     bounced to / ; admins hitting / are NOT forced into /admin —
 *     they can view the clinic-facing dashboard too (useful for
 *     QA/support), but typically land on /admin via the post-login
 *     redirect in app/login.
 */
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Whitelisted paths for unauthenticated users
const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/api/onboarding"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Webhook routes authenticate via signature, not session — skip entirely.
  if (pathname.startsWith("/api/webhooks/")) {
    return response;
  }

  if (user) {
    // Fetch user profile to enforce role-based access
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";

    // UX Friction Fix: Prevent logged-in users from seeing the login/signup pages
    if (isPublicPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = isAdmin ? "/admin" : "/";
      url.search = ""; // Wipe query params like ?redirect
      return NextResponse.redirect(url);
    }

    // Admin-area gate
    if (pathname.startsWith("/admin") && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return response;
    
  } else {
    // Unauthenticated users
    if (isPublicPath(pathname)) {
      return response;
    }

    // No session → /login, preserving where they were headed.
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon/icon files
     * - public assets with file extensions (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};