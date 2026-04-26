import type { CompanyProfileCompletionInput } from "@/lib/company-profile";
import { createServiceRoleSupabase } from "@/lib/supabase-service-role";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function getUserRoleById(userId: string): Promise<string | null> {
  const admin = createServiceRoleSupabase();
  if (admin) {
    const { data, error } = await admin.from("user_profiles").select("role").eq("id", userId).maybeSingle();
    if (!error && data != null) {
      return ((data as { role?: unknown }).role as string | undefined) ?? null;
    }
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("user_profiles").select("role").eq("id", userId).maybeSingle();
  return ((data as { role?: unknown } | null)?.role as string | undefined) ?? null;
}

export async function getCompanyProfileByUserId(
  userId: string,
): Promise<CompanyProfileCompletionInput | null> {
  const admin = createServiceRoleSupabase();
  if (admin) {
    const { data, error } = await admin
      .from("company_profiles")
      .select("company_name, contact_person, contact_email")
      .eq("user_id", userId)
      .maybeSingle();
    if (!error) {
      return (data as CompanyProfileCompletionInput | null) ?? null;
    }
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("company_profiles")
    .select("company_name, contact_person, contact_email")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as CompanyProfileCompletionInput | null) ?? null;
}
