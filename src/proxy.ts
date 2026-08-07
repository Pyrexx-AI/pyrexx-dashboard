import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/api/onboarding"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const { pathname, searchParams } = request.nextUrl;

  // Webhooks bypass session auth (authenticated via HMAC signatures)
  if (pathname.startsWith("/api/webhooks/")) {
    return response;
  }

  if (user) {
    // Fetch user profile role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";
    const isInspectingClinic = searchParams.has("previewClinicId");

    // Redirect logged-in users away from public auth pages
    if (isPublicPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = isAdmin ? "/admin" : "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // ENFORCE ADMIN ROUTING RULE:
    // Admin accessing root `/` WITHOUT a preview parameter is redirected to `/admin`
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