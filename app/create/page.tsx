import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CreateRedirectPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user != null) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = profile != null ? (profile as { role: string }).role : null;
    if (role === "consultant") {
      redirect("/consultant/edit");
    }
  }

  redirect("/signup?role=consultant");
}
