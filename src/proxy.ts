import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createAdminClient } from "@/lib/supabase/server";

const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/api/onboarding"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, searchParams } = request.nextUrl;

  // Webhooks authenticate via HMAC signatures — skip session checks
  if (pathname.startsWith("/api/webhooks/")) {
    return response;
  }

  if (user) {
    // 1. Check user metadata first (fastest, zero network overhead)
    let isAdmin = 
      user.user_metadata?.role === "admin" || 
      user.app_metadata?.role === "admin";

    // 2. Fail-safe database check using Service Role client to bypass RLS blocks
    if (!isAdmin) {
      try {
        const adminSupabase = createAdminClient();
        const { data: profile } = await adminSupabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role === "admin") {
          isAdmin = true;
        }
      } catch (e) {
        // Retain current isAdmin state if database check fails
      }
    }

    const isInspectingClinic = searchParams.has("previewClinicId");

    // Redirect authenticated users away from login/signup pages
    if (isPublicPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = isAdmin ? "/admin" : "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // STRICT ADMIN ROUTING RULE:
    // Admin on root `/` without a preview parameter goes straight to `/admin`
    if (pathname === "/" && isAdmin && !isInspectingClinic) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }

    // Protect `/admin` routes against non-admin clinic users
    if (pathname.startsWith("/admin") && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return response;
  } else {
    // Unauthenticated user handling
    if (isPublicPath(pathname)) {
      return response;
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }
}