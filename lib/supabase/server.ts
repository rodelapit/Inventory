import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/config";

export function createSupabaseServerClient() {
  const env = getSupabaseEnv();

  if (!env) {
    throw new Error("Supabase env vars are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  // Prefer a service role key on the server for privileged operations if available.
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const keyToUse = serviceRoleKey && serviceRoleKey.length > 20 ? serviceRoleKey : env.anonKey;

  return createClient(env.url, keyToUse, {
    auth: {
      persistSession: false,
    },
  });
}

export function createSupabaseAdminClient() {
  const env = getSupabaseEnv();

  if (!env) {
    throw new Error("Supabase env vars are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey || serviceRoleKey.length < 20) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env.local for server-side writes.");
  }

  return createClient(env.url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

export { isSupabaseConfigured };
