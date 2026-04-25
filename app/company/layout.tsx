import { requireCompany } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export default async function CompanySectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCompany();
  return children;
}
