/** Client-safe role → dashboard path (no server-only imports). */

export type UserRole = "company" | "consultant" | "admin";

export type UserProfileRow = {
  id: string;
  email: string | null;
  role: UserRole;
  created_at: string;
};

export function dashboardPathForRole(role: string): string {
  if (role === "company") return "/company";
  /** Talent lands on dashboard home. */
  if (role === "consultant") return "/talent";
  if (role === "admin") return "/admin/resources";
  return "/";
}

function safeInternalNextPath(next: string | null | undefined): string | null {
  if (next == null || typeof next !== "string") return null;
  const t = next.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return null;
  if (t.includes("://")) return null;
  return t;
}

/** Company-only flows: interview request or engagement proposal for a marketplace listing. */
function isCompanyConsultantActionPath(path: string): boolean {
  return /^\/consultants\/[^/]+\/(request-interview|propose-engagement)$/.test(path);
}

/**
 * After login: use `next` when it is a safe internal path and allowed for the user's role;
 * otherwise fall back to the role dashboard.
 */
export function postLoginRedirectPath(role: string, next: string | null | undefined): string {
  const safe = safeInternalNextPath(next);
  if (safe === "/marketplace") return "/marketplace";
  if (safe === "/company" && role === "company") return "/company";
  if (safe === "/requests" && role === "company") return "/company";
  if (safe === "/create" && role === "consultant") return "/talent";
  if (role === "company" && safe != null && isCompanyConsultantActionPath(safe)) {
    return safe;
  }
  if (safe === "/talent" && role === "consultant") return "/talent";
  if (safe === "/talent/edit" && role === "consultant") return "/talent/edit";
  if (safe === "/talent/availability" && role === "consultant") return "/talent/availability";
  if (safe === "/consultant" && role === "consultant") return "/talent";
  if (safe === "/consultant/edit" && role === "consultant") return "/talent/edit";
  if (safe === "/consultant/availability" && role === "consultant") return "/talent/availability";
  if (safe === "/consultant/claim" && role === "consultant") return "/talent/claim";
  if (
    safe != null &&
    (safe === "/admin/resources" || safe.startsWith("/admin/")) &&
    role === "admin"
  ) {
    return safe;
  }
  return dashboardPathForRole(role);
}
