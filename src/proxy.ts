import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { verifyAdminStatus } from "@/lib/auth/admin";

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
    const isAdmin = await verifyAdminStatus(user);
    const isInspectingClinic = searchParams.has("previewClinicId");

    // Redirect authenticated users away from public auth pages
    if (isPublicPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = isAdmin ? "/admin" : "/";
      url.search = "";
      const redirectRes = NextResponse.redirect(url);
      response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value, c));
      return redirectRes;
    }

    // STRICT ADMIN ROUTING:
    // Admin on root `/` without an active preview parameter is routed to `/admin`
    if (pathname === "/" && isAdmin && !isInspectingClinic) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      const redirectRes = NextResponse.redirect(url);
      response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value, c));
      return redirectRes;
    }

    // Gate `/admin` routes against non-admin clinic users
    if (pathname.startsWith("/admin") && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      const redirectRes = NextResponse.redirect(url);
      response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value, c));
      return redirectRes;
    }

    return response;
  } else {
    // Unauthenticated user routing
    if (isPublicPath(pathname)) {
      return response;
    }

    // For API routes, return structured 401 JSON instead of redirecting to login page
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized: Authentication required." }, { status: 401 });
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    const redirectRes = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value, c));
    return redirectRes;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};