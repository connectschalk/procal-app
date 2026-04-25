"use server";

import type { UserProfileRow } from "@/lib/auth-routing";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentUserProfile(): Promise<UserProfileRow | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user == null) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, email, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error != null || data == null) return null;

  const row = data as {
    id: string;
    email: string | null;
    role: string;
    created_at: string;
  };
  const r = row.role;
  if (r !== "company" && r !== "consultant" && r !== "admin") return null;

  return {
    id: row.id,
    email: row.email,
    role: r,
    created_at: row.created_at,
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
