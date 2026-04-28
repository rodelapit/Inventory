"use server";

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { clearSessionCookies, getCurrentSessionUser, setSessionCookies } from "@/lib/auth/session";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

// Resolve the public app origin so recovery links work on local and deployed environments.
async function resolveAppOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  if (!host) return null;
  return `${proto}://${host}`;
}

// Resolve the effective user role from profiles first, then fall back to auth metadata.
async function resolveUserRole(userId: string, user: { user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> }) {
  try {
    const adminClient = createSupabaseAdminClient();
    const { data: profile } = await adminClient.from("profiles").select("role").eq("user_id", userId).maybeSingle();
    const profileRole = typeof profile?.role === "string" ? profile.role.trim().toLowerCase() : null;
    if (profileRole) return profileRole;
  } catch {
    // Fall back to auth metadata when profile lookup is unavailable.
  }

  const metadataRoleRaw = user.user_metadata?.role ?? user.app_metadata?.role ?? null;
  return typeof metadataRoleRaw === "string" ? metadataRoleRaw.trim().toLowerCase() : null;
}

export async function loginWithPassword(formData: FormData) {
  // Normalize login inputs before talking to Supabase so invalid requests fail fast.
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const requestedRole = String(formData.get("role") ?? "Staff").trim().toLowerCase();
  const loginPathRaw = String(formData.get("loginPath") ?? "/login").trim();
  const loginPath = loginPathRaw.startsWith("/") ? loginPathRaw : "/login";

  if (!email || !password) {
    redirect(`${loginPath}?error=missing-fields`);
  }
      
  if (!isSupabaseConfigured()) {
    redirect(`${loginPath}?error=supabase-not-configured`);
  }

  const env = getSupabaseEnv();
  if (!env) {
    redirect(`${loginPath}?error=supabase-not-configured`);
  }

  // Interactive sign-in uses the anon key so session creation follows the browser auth flow.
  const supabase = createClient(env.url, env.anonKey, {
    auth: {
      persistSession: false,
    },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data?.user) {
    redirect(`${loginPath}?error=invalid-credentials`);
  }

  const userId = data.user.id;

  const resolvedRole = await resolveUserRole(userId, data.user);

  if (requestedRole === "staff" && resolvedRole !== "staff") {
    redirect(`${loginPath}?error=staff-role-required`);
  }

  if (requestedRole === "admin" && resolvedRole === "staff") {
    redirect(`${loginPath}?error=admin-role-required`);
  }

  if (data.session?.access_token) {
    await setSessionCookies(data.session.access_token, data.session.refresh_token);
  } else {
    await clearSessionCookies();
  }

  if (resolvedRole === "staff") {
    redirect("/staff");
  }

  redirect("/dashboard");
}

export async function signupStaff(formData: FormData) {
  // Only admins can create staff accounts from this server action.
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!fullName || !email || !password || !confirmPassword) {
    redirect("/signup?error=missing-fields");
  }

  if (password !== confirmPassword) {
    redirect("/signup?error=password-mismatch");
  }

  if (!isSupabaseConfigured()) {
    redirect("/signup?error=supabase-not-configured");
  }

  // Check the current session before allowing account creation.
  const session = await getCurrentSessionUser();
  if (!session || session.role !== "admin") {
    redirect("/login");
  }

  // Create the auth account first, then mirror the role in the profiles table.
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: "staff",
      },
    },
  });

  if (error || !data?.user) {
    redirect("/signup?error=signup-failed");
  }

  // The profile upsert is best-effort because the auth account already exists.
  try {
    const adminClient = createSupabaseAdminClient();
    await adminClient.from("profiles").upsert(
      {
        user_id: data.user.id,
        role: "staff",
      },
      {
        onConflict: "user_id",
      },
    );
  } catch {
    // Best-effort write for profile linking. Auth account is already created.
  }

  redirect("/staff/login?registered=1");
}

export async function requestPasswordReset(formData: FormData) {
  // Capture the email and login path so the recovery flow can return to the right entry point.
  const email = String(formData.get("email") ?? "").trim();
  const loginPathRaw = String(formData.get("loginPath") ?? "/login").trim();
  const loginPath = loginPathRaw.startsWith("/") ? loginPathRaw : "/login";

  if (!email) {
    redirect(`/forgot-password?loginPath=${encodeURIComponent(loginPath)}&error=missing-fields`);
  }

  if (!isSupabaseConfigured()) {
    redirect(`/forgot-password?loginPath=${encodeURIComponent(loginPath)}&error=supabase-not-configured`);
  }

  const env = getSupabaseEnv();
  if (!env) {
    redirect(`/forgot-password?loginPath=${encodeURIComponent(loginPath)}&error=supabase-not-configured`);
  }

  // Build the callback URL from the current deployment origin.
  const origin = (await resolveAppOrigin()) ?? env.url;
  const supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: false },
  });

  // Preserve the original login path through the recovery round-trip.
  const resetPath = `/reset-password?loginPath=${encodeURIComponent(loginPath)}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(resetPath)}`,
  });

  if (error) {
    redirect(`/forgot-password?loginPath=${encodeURIComponent(loginPath)}&error=reset-failed`);
  }

  redirect(`/forgot-password?loginPath=${encodeURIComponent(loginPath)}&sent=1`);
}

export async function updatePassword(formData: FormData) {
  // Validate the new password pair before attempting the update.
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const loginPathRaw = String(formData.get("loginPath") ?? "/login").trim();
  const loginPath = loginPathRaw.startsWith("/") ? loginPathRaw : "/login";

  if (!password || !confirmPassword) {
    redirect(`/reset-password?loginPath=${encodeURIComponent(loginPath)}&error=missing-fields`);
  }

  if (password !== confirmPassword) {
    redirect(`/reset-password?loginPath=${encodeURIComponent(loginPath)}&error=password-mismatch`);
  }

  const session = await getCurrentSessionUser();
  if (!session) {
    redirect(`/login?error=invalid-credentials`);
  }

  // The password update writes directly to Auth, so it uses the admin client.
  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(session.userId, { password });

  if (error) {
    redirect(`/reset-password?loginPath=${encodeURIComponent(loginPath)}&error=reset-failed`);
  }

  await clearSessionCookies();
  redirect(`${loginPath}?reset=1`);
}
