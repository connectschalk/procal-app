import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for server routes that must bypass RLS (e.g. claim code write).
 * Returns null if SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export function createServiceRoleSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
