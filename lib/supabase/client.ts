import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/config";

declare global {
  // Keep one browser client instance across fast-refresh cycles.
  var __supabaseBrowserClient: SupabaseClient | undefined;
}

export function createSupabaseBrowserClient() {
  const env = getSupabaseEnv();

  if (!env) {
    throw new Error("Supabase env vars are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  if (typeof window === "undefined") {
    return createClient(env.url, env.anonKey);
  }

  if (!globalThis.__supabaseBrowserClient) {
    globalThis.__supabaseBrowserClient = createClient(env.url, env.anonKey);
  }

  return globalThis.__supabaseBrowserClient;
}
