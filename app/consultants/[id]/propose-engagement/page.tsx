import { AppTopNav } from "@/components/app-top-nav";
import { EngagementProposalForm } from "@/components/engagement-proposal-form";
import { isCompanyProfileComplete } from "@/lib/company-profile";
import { getCompanyProfileByUserId } from "@/lib/company-profile-server";
import { requireCompany } from "@/lib/require-role";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProposeEngagementPage({ params }: PageProps) {
  const { id } = await params;
  await requireCompany({ returnPath: `/consultants/${id}/propose-engagement` });
  const supabaseServer = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (user == null) {
    redirect(`/login?next=${encodeURIComponent(`/consultants/${id}/propose-engagement`)}`);
  }
  const companyProfile = await getCompanyProfileByUserId(user.id);
  if (!isCompanyProfileComplete(companyProfile)) {
    redirect("/company?completeProfile=1");
  }

  const { data, error } = await supabase
    .from("resources")
    .select("id, name")
    .eq("id", id)
    .eq("profile_status", "approved")
    .single();

  if (error || !data) {
    notFound();
  }

  const consultantName = (data.name as string) ?? "Consultant";

  return (
    <>
      <AppTopNav />
      <main className="mx-auto min-h-screen w-full max-w-2xl bg-white px-6 py-10 md:px-10 md:py-16">
        <Link
          href={`/consultants/${id}`}
          className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
        >
          ← Back to profile
        </Link>

        <header className="mt-8 space-y-2 border-b border-zinc-200 pb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
            Propose an engagement
          </h1>
          <p className="text-sm leading-relaxed text-zinc-600">
            Share company details, timeline, scope, and an optional rate. The consultant will follow
            up outside the app for now.
          </p>
        </header>

        <div className="mt-10">
          <EngagementProposalForm resourceId={id} consultantName={consultantName} />
        </div>
      </main>
    </>
  );
}
