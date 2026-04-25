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

export type RequireCompanyOptions = {
  /**
   * When set (e.g. company action under /consultants/...): unauthenticated →
   * `/login?next=<returnPath>`; missing profile or non-company → `/marketplace`.
   * When omitted (e.g. /company dashboard): same as before → `/login` and `/`.
   */
  returnPath?: string;
};

/**
 * Server-only guard for company-only routes.
 * Default: no user → /login; wrong role or no profile → /.
 * With `returnPath`: no user → login with next; wrong role or no profile → /marketplace.
 */
export async function requireCompany(options?: RequireCompanyOptions): Promise<void> {
  const returnPath = options?.returnPath;
  const useActionRedirects = returnPath != null && returnPath.trim() !== "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user == null) {
    if (useActionRedirects) {
      redirect(`/login?next=${encodeURIComponent(returnPath.trim())}`);
    }
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error != null || profile == null) {
    redirect(useActionRedirects ? "/marketplace" : "/");
  }

  const role = (profile as { role: string }).role;
  if (role !== "company") {
    redirect(useActionRedirects ? "/marketplace" : "/");
  }
}
