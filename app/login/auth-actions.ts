"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseEnv } from "@/lib/supabase/config";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export async function loginWithPassword(formData: FormData) {
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

  // Use anon key for interactive sign-in to avoid admin-key auth edge cases.
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

  let role: string | null = null;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    role = (profile?.role ?? null) as string | null;
  } catch {
    // if anything goes wrong reading profiles, fall back to admin dashboard
    role = null;
  }

  const normalizedProfileRole = role?.trim().toLowerCase() ?? null;
  const metadataRoleRaw = data.user.user_metadata?.role ?? data.user.app_metadata?.role ?? null;
  const metadataRole =
    typeof metadataRoleRaw === "string" ? metadataRoleRaw.trim().toLowerCase() : null;
  const resolvedRole = normalizedProfileRole ?? metadataRole;

  if (requestedRole === "staff" && resolvedRole !== "staff") {
    redirect(`${loginPath}?error=staff-role-required`);
  }

  if (requestedRole === "admin" && resolvedRole === "staff") {
    redirect(`${loginPath}?error=admin-role-required`);
  }

  const cookieStore = await cookies();

  if (resolvedRole === "staff") {
    cookieStore.set("staff_auth", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    redirect("/staff");
  }

  cookieStore.delete("staff_auth");

  redirect("/");
}

export async function signupStaff(formData: FormData) {
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
