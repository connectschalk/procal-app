import { SignupForm, type SignupRole } from "./signup-form";

type RoleParam = string | string[] | undefined;

function initialSignupRole(role: RoleParam): SignupRole {
  const v = Array.isArray(role) ? role[0] : role;
  if (v === "consultant" || v === "company") return v;
  return "company";
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: RoleParam }>;
}) {
  const sp = await searchParams;
  return <SignupForm initialRole={initialSignupRole(sp.role)} />;
}
