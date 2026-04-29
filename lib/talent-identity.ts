import { getCompanyProfileByUserId, getUserRoleById } from "@/lib/company-profile-server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceRoleSupabase } from "@/lib/supabase-service-role";

type IdentityCandidates = {
  emails: string[];
  companies: string[];
};

function normalizeNonEmpty(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

async function getCompanyIdentityCandidates(): Promise<IdentityCandidates | null> {
  const supabaseServer = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (user == null) return null;

  const role = await getUserRoleById(user.id);
  if (role !== "company") return null;

  const companyProfile = await getCompanyProfileByUserId(user.id);
  const emailCandidates = [
    normalizeNonEmpty(user.email),
    normalizeNonEmpty(companyProfile?.contact_email ?? null),
  ].filter((value): value is string => value != null);
  const companyCandidates = [normalizeNonEmpty(companyProfile?.company_name ?? null)].filter(
    (value): value is string => value != null,
  );
  return {
    emails: [...new Set(emailCandidates)],
    companies: [...new Set(companyCandidates)],
  };
}

async function fetchMatchingResourceIds(
  table: "interview_requests" | "engagement_proposals",
  resourceIds: string[],
  identities: IdentityCandidates,
): Promise<Set<string>> {
  if (resourceIds.length === 0) return new Set<string>();
  const admin = createServiceRoleSupabase();
  if (admin == null) return new Set<string>();

  const queries = [
    ...identities.emails.map((email) =>
      admin.from(table).select("resource_id").in("resource_id", resourceIds).ilike("requester_email", email),
    ),
    ...identities.companies.map((company) =>
      admin.from(table).select("resource_id").in("resource_id", resourceIds).ilike("company_name", company),
    ),
  ];
  const results = await Promise.all(queries);
  const ids = new Set<string>();
  for (const res of results) {
    if (res.error != null) continue;
    for (const row of res.data ?? []) {
      const value = (row as { resource_id?: string | null }).resource_id;
      const resourceId = normalizeNonEmpty(value);
      if (resourceId != null) {
        ids.add(resourceId);
      }
    }
  }
  return ids;
}

export async function getCompanyRelationshipMap(resourceIds: string[]): Promise<Map<string, boolean>> {
  const uniqueResourceIds = [...new Set(resourceIds.filter((id) => id.trim() !== ""))];
  const byResource = new Map<string, boolean>(uniqueResourceIds.map((id) => [id, false]));
  if (uniqueResourceIds.length === 0) return byResource;

  const identities = await getCompanyIdentityCandidates();
  if (identities == null || (identities.emails.length === 0 && identities.companies.length === 0)) {
    return byResource;
  }

  const [interviewIds, proposalIds] = await Promise.all([
    fetchMatchingResourceIds("interview_requests", uniqueResourceIds, identities),
    fetchMatchingResourceIds("engagement_proposals", uniqueResourceIds, identities),
  ]);
  for (const id of uniqueResourceIds) {
    if (interviewIds.has(id) || proposalIds.has(id)) {
      byResource.set(id, true);
    }
  }
  return byResource;
}

export function getAnonymizedTalentDisplayName(headline: string | null, resourceId: string): string {
  const trimmedHeadline = normalizeNonEmpty(headline);
  if (trimmedHeadline != null) {
    return trimmedHeadline;
  }
  const cleanedId = resourceId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const shortId = cleanedId.slice(0, 3) || "TAL";
  return `Talent #${shortId}`;
}
