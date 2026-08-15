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
    // 1. Fast metadata check (zero network overhead)
    let isAdmin = 
      user.user_metadata?.role === "admin" || 
      user.app_metadata?.role === "admin";

    // 2. Service Role query fallback (bypasses RLS recursion or context drops)
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
        // Fallback to current isAdmin status if database check fails
      }
    }

    const isInspectingClinic = searchParams.has("previewClinicId");

    // Redirect authenticated users away from public auth pages
    if (isPublicPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = isAdmin ? "/admin" : "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // STRICT ADMIN ROUTING:
    // Admin accessing root `/` without an active preview parameter is routed to `/admin`
    if (pathname === "/" && isAdmin && !isInspectingClinic) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }

    // Gate `/admin` routes against non-admin clinic users
    if (pathname.startsWith("/admin") && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return response;
  } else {
    // Unauthenticated user routing
    if (isPublicPath(pathname)) {
      return response;
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};