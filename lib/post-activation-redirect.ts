import type { SupabaseClient } from "@supabase/supabase-js";
import { postLoginRedirectPath } from "@/lib/auth-routing";
import { OTHER_TALENT_OPTION } from "@/lib/talent-taxonomy";

type ResourceRow = {
  id?: string;
  claimed?: boolean | null;
  profile_status?: string | null;
  name?: string | null;
  headline?: string | null;
  bio?: string | null;
  hourly_rate?: number | null;
  location?: string | null;
  industry?: string | null;
  resource_type?: string | null;
  other_resource_type?: string | null;
  avatar_key?: string | null;
  profile_photo_path?: string | null;
  cv_document_path?: string | null;
  id_front_document_path?: string | null;
  id_back_document_path?: string | null;
  available_from?: string | null;
};

function talentProfileNeedsSetup(r: ResourceRow, hasBlockedDates: boolean): boolean {
  const profileComplete =
    Boolean(r.name && r.name.trim() !== "") &&
    Boolean(r.headline && r.headline.trim() !== "") &&
    Boolean(r.bio && r.bio.trim() !== "") &&
    r.hourly_rate != null &&
    Boolean(r.location && r.location.trim() !== "") &&
    Boolean(r.industry && r.industry.trim() !== "") &&
    Boolean(r.resource_type && r.resource_type.trim() !== "") &&
    (!(r.industry === OTHER_TALENT_OPTION || r.resource_type === OTHER_TALENT_OPTION) ||
      Boolean(r.other_resource_type && r.other_resource_type.trim() !== ""));
  const avatarComplete = Boolean(r.avatar_key && r.avatar_key.trim() !== "");
  const photoComplete = Boolean(r.profile_photo_path && r.profile_photo_path.trim() !== "");
  const cvComplete = Boolean(r.cv_document_path && r.cv_document_path.trim() !== "");
  const idFrontComplete = Boolean(r.id_front_document_path && r.id_front_document_path.trim() !== "");
  const idBackComplete = Boolean(r.id_back_document_path && r.id_back_document_path.trim() !== "");
  const availabilityComplete =
    Boolean(r.available_from && String(r.available_from).trim() !== "") || hasBlockedDates;
  return (
    !profileComplete ||
    !avatarComplete ||
    !photoComplete ||
    !cvComplete ||
    !idFrontComplete ||
    !idBackComplete ||
    !availabilityComplete
  );
}

/**
 * After email activation (or login from `/auth/confirmed`), send the user to the
 * right onboarding step or dashboard.
 */
export async function resolvePostActivationPath(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user == null) {
    return "/login";
  }

  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr != null || profile == null) {
    return "/login?error=missing_profile";
  }

  const role = (profile as { role: string }).role;
  if (role === "admin") {
    return "/admin/resources";
  }
  if (role === "company") {
    return "/company";
  }
  if (role !== "consultant") {
    return "/";
  }

  const email = user.email?.trim();
  if (email == null || email === "") {
    return "/talent/edit";
  }

  const { data: resourceRows, error: resourcesError } = await supabase
    .from("resources")
    .select(
      "id, claimed, profile_status, name, headline, bio, hourly_rate, location, industry, resource_type, other_resource_type, avatar_key, profile_photo_path, cv_document_path, id_front_document_path, id_back_document_path, available_from",
    )
    .ilike("contact_email", email);

  if (resourcesError != null) {
    return "/talent";
  }

  const resources = (resourceRows ?? []) as ResourceRow[];
  if (resources.length === 0) {
    return "/talent/edit";
  }
  if (resources.length > 1) {
    return "/talent";
  }

  const r = resources[0]!;
  const resourceId = r.id;
  let hasBlockedDates = false;
  if (typeof resourceId === "string" && resourceId.trim() !== "") {
    const { count } = await supabase
      .from("resource_blocked_dates")
      .select("id", { count: "exact", head: true })
      .eq("resource_id", resourceId);
    hasBlockedDates = (count ?? 0) > 0;
  }

  if (r.claimed !== true) {
    return "/talent/claim";
  }
  if (r.profile_status === "draft") {
    return "/talent/edit";
  }
  if (talentProfileNeedsSetup(r, hasBlockedDates)) {
    return "/talent/edit";
  }

  return "/talent?welcome=1";
}

export async function resolveLoginRedirectPath(
  supabase: SupabaseClient,
  nextFromUrl: string | null,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user == null) {
    return "/login";
  }

  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr != null || profile == null) {
    return "/login?error=missing_profile";
  }

  const role = (profile as { role: string }).role;
  return postLoginRedirectPath(role, nextFromUrl);
}
