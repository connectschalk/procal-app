import { requireConsultant } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export default async function ConsultantSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireConsultant();
  return children;
}
