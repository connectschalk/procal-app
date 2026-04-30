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
