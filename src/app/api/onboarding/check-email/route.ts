import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  let email: string | undefined;

  try {
    const body = await req.json();
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const supabaseUrlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    // 1. Check existing clinics table for contact_email collision
    const { data: clinic } = await supabase
      .from("clinics")
      .select("id")
      .eq("contact_email", email)
      .maybeSingle();

    if (clinic) {
      return NextResponse.json({ exists: true });
    }

    // 2. Query Supabase Auth GoTrue admin endpoint to detect registered users
    if (supabaseUrlRaw && serviceRoleKey) {
      const supabaseUrl = supabaseUrlRaw.replace(/\/$/, "");
      const authRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          cache: "no-store",
        }
      );

      if (authRes.ok) {
        const authData = await authRes.json();
        const users = authData?.users || (Array.isArray(authData) ? authData : []);
        const exactMatch = users.some(
          (u: any) => typeof u.email === "string" && u.email.toLowerCase() === email
        );

        if (exactMatch) {
          return NextResponse.json({ exists: true });
        }
      }
    }

    return NextResponse.json({ exists: false });
  } catch (err) {
    console.error("Email pre-check error:", err);
    // On unexpected server error, do not trap the user; fail open
    return NextResponse.json({ exists: false });
  }
}