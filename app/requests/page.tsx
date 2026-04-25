import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RequestsRedirectPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user == null) {
    redirect("/login?next=/company");
  }
  redirect("/company");
}
