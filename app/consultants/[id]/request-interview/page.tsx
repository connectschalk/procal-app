import { AppTopNav } from "@/components/app-top-nav";
import { InterviewRequestForm } from "@/components/interview-request-form";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RequestInterviewPage({ params }: PageProps) {
  const { id } = await params;

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
          Request an interview
        </h1>
        <p className="text-sm leading-relaxed text-zinc-600">
          Share your details and up to three proposed times. The consultant will follow up outside
          the app for now.
        </p>
      </header>

      <div className="mt-10">
        <InterviewRequestForm resourceId={id} consultantName={consultantName} />
      </div>
      </main>
    </>
  );
}
