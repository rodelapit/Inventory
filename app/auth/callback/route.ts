import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { clearSessionCookies, setSessionCookies } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  // Supabase sends the user back here after OAuth or recovery-link verification.
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextPath = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=invalid-credentials", req.url));
  }

  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.redirect(new URL("/login?error=supabase-not-configured", req.url));
  }

  const supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: false },
  });

  // Turn the temporary code into a long-lived session before redirecting.
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session || !data.user) {
    await clearSessionCookies();
    return NextResponse.redirect(new URL("/login?error=invalid-credentials", req.url));
  }

  await setSessionCookies(data.session.access_token, data.session.refresh_token);

  // Password recovery should continue straight into the reset screen.
  if (nextPath.startsWith("/reset-password")) {
    return NextResponse.redirect(new URL(nextPath, req.url));
  }

  // Read the authoritative role from profiles first so routing matches app permissions.
  let role: string | null = null;
  try {
    const adminClient = createSupabaseAdminClient();
    const { data: profile } = await adminClient.from("profiles").select("role").eq("user_id", data.user.id).maybeSingle();
    const profileRecord = profile as { role?: unknown } | null;
    const profileRole = typeof profileRecord?.role === "string" ? profileRecord.role.trim().toLowerCase() : null;
    role = profileRole;
  } catch {
    // Fall back to auth metadata when profile lookup is unavailable.
  }

  if (!role) {
    const metadataRoleRaw = data.user.user_metadata?.role ?? data.user.app_metadata?.role ?? null;
    role = typeof metadataRoleRaw === "string" ? metadataRoleRaw.trim().toLowerCase() : null;
  }

  // Staff users go directly to the staff workspace.
  if (role === "staff") {
    return NextResponse.redirect(new URL("/staff", req.url));
  }

  // Admin users stay in the dashboard area unless the flow asked for a different internal route.
  if (nextPath.startsWith("/") && nextPath !== "/dashboard") {
    return NextResponse.redirect(new URL(nextPath, req.url));
  }

  return NextResponse.redirect(new URL("/dashboard", req.url));
}