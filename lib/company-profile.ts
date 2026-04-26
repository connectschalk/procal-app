export type CompanyProfileCompletionInput = {
  company_name?: string | null;
  contact_person?: string | null;
  contact_email?: string | null;
};

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim() !== "";
}

export function isCompanyProfileComplete(profile: CompanyProfileCompletionInput | null | undefined): boolean {
  if (profile == null) return false;
  return (
    hasText(profile.company_name) &&
    hasText(profile.contact_person) &&
    hasText(profile.contact_email)
  );
}
