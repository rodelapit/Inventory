import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login?error=supabase-not-configured", req.url));
  }

  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.redirect(new URL("/login?error=supabase-not-configured", req.url));
  }

  const supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: false },
  });
  const callbackUrl = new URL("/auth/callback", req.url).toString();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?error=invalid-credentials", req.url));
  }

  return NextResponse.redirect(data.url);
}