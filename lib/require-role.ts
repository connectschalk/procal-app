import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

/**
 * Server-only guard for admin App Router pages.
 * No user → /login. User without admin role → /. Admin → returns (render page).
 */
export async function requireAdmin(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user == null) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error != null || profile == null) {
    redirect("/");
  }

  const role = (profile as { role: string }).role;
  if (role !== "admin") {
    redirect("/");
  }
}

/**
 * Server-only guard for Talent (consultant role) App Router pages under /consultant.
 * No user → /login. User without consultant role → /. Consultant → returns (render page).
 */
export async function requireConsultant(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user == null) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error != null || profile == null) {
    redirect("/");
  }

  const role = (profile as { role: string }).role;
  if (role !== "consultant") {
    redirect("/");
  }
}

/**
 * Server-only guard for Company App Router pages under /company.
 * No user → /login. User without company role → /. Company → returns (render page).
 */
export async function requireCompany(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user == null) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error != null || profile == null) {
    redirect("/");
  }

  const role = (profile as { role: string }).role;
  if (role !== "company") {
    redirect("/");
  }
}
