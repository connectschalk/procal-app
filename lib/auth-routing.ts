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
  if (role === "consultant") return "/consultant";
  if (role === "admin") return "/admin/resources";
  return "/";
}
