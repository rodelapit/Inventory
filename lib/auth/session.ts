import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/config";

type SessionRole = "staff" | "admin" | "owner" | "manager" | "unknown";

export type SessionUser = {
  userId: string;
  email: string | null;
  role: SessionRole;
  accessToken: string;
};

const ACCESS_TOKEN_COOKIE = "sb_access_token";
const REFRESH_TOKEN_COOKIE = "sb_refresh_token";

function normalizeRole(value: unknown): SessionRole {
  const role = String(value ?? "").trim().toLowerCase();
  if (role === "staff" || role === "admin" || role === "owner" || role === "manager") {
    return role;
  }
  return "unknown";
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  };
}

export async function setSessionCookies(accessToken: string, refreshToken?: string | null) {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, getCookieOptions());

  if (refreshToken) {
    cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, getCookieOptions());
  }
}

export async function clearSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  cookieStore.delete("staff_auth");
}

export async function getCurrentSessionUser(): Promise<SessionUser | null> {
  const env = getSupabaseEnv();
  if (!env) return null;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return null;

  const supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  let profileRole: string | null = null;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();

    profileRole = typeof profile?.role === "string" ? profile.role : null;
  } catch {
    profileRole = null;
  }

  const metadataRole =
    typeof data.user.user_metadata?.role === "string"
      ? data.user.user_metadata.role
      : typeof data.user.app_metadata?.role === "string"
      ? data.user.app_metadata.role
      : null;

  const role = normalizeRole(profileRole ?? metadataRole);

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    role,
    accessToken,
  };
}

export async function requireStaffSession(redirectTo = "/staff/login") {
  const session = await getCurrentSessionUser();

  if (!session || session.role !== "staff") {
    redirect(redirectTo);
  }

  return session;
}
