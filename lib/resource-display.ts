type ResourceLabelInput = {
  resource_type: string | null;
  other_resource_type: string | null;
  headline?: string | null;
};

export function getResourceTypeLabel(resource: ResourceLabelInput): string {
  const resourceType = resource.resource_type?.trim() ?? "";
  const otherResourceType = resource.other_resource_type?.trim() ?? "";
  if (resourceType === "Other" && otherResourceType !== "") return otherResourceType;
  if (resourceType !== "") return resourceType;
  const headline = resource.headline?.trim() ?? "";
  return headline !== "" ? headline : "Verified Talent";
}

export function getResourceCategoryLabel(resource: ResourceLabelInput & { industry: string | null }): string {
  const industry = resource.industry?.trim() ?? "";
  const typeLabel = getResourceTypeLabel(resource);
  if (industry !== "") return `${industry} · ${typeLabel}`;
  return typeLabel;
}

/** Role line for marketplace cards — no headline fallback (avoids duplicating the bio headline). */
export function getMarketplaceRoleLine(resource: {
  resource_type: string | null;
  other_resource_type: string | null;
}): string {
  const resourceType = resource.resource_type?.trim() ?? "";
  const otherResourceType = resource.other_resource_type?.trim() ?? "";
  if (resourceType === "Other" && otherResourceType !== "") return otherResourceType;
  if (resourceType !== "") return resourceType;
  return "";
}

export function getMarketplaceIndustryLine(industry: string | null): string {
  return industry?.trim() ?? "";
}

/** `Role • Industry`, or a single side if the other is empty; `null` if both empty. */
export function getMarketplaceRoleIndustryLine(resource: {
  industry: string | null;
  resource_type: string | null;
  other_resource_type: string | null;
}): string | null {
  const role = getMarketplaceRoleLine(resource);
  const ind = getMarketplaceIndustryLine(resource.industry);
  if (role === "" && ind === "") return null;
  if (role === "") return ind;
  if (ind === "") return role;
  return `${role} • ${ind}`;
}
