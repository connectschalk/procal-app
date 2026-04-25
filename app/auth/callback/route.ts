/**
 * Email confirmation / OAuth PKCE callback.
 *
 * Supabase Auth → Authentication → Email templates (Confirm signup):
 * The confirmation link must return users to this route. Prefer setting
 * Site URL + Redirect URLs in the Supabase dashboard, and use `emailRedirectTo`
 * from the app (see signup-form). If you customize the template body, the
 * confirmation URL should include redirect_to your app callback, e.g.:
 *   {{ .ConfirmationURL }}&redirect_to=https://procal.co.za/auth/callback
 * (Use your real production origin; local dev: http://localhost:3000/auth/callback)
 */

import { dashboardPathForRole } from "@/lib/auth-routing";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const VALID_ROLES = new Set(["company", "consultant", "admin"]);

function applyCookies(
  response: NextResponse,
  jar: Map<string, { value: string; options?: CookieOptions }>,
) {
  for (const [name, { value, options }] of jar) {
    response.cookies.set(name, value, options);
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;

  if (code == null || code === "") {
    return NextResponse.redirect(new URL("/login?error=missing_code", origin));
  }

  const cookieJar = new Map<string, { value: string; options?: CookieOptions }>();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          for (const { name, value, options } of cookiesToSet) {
            cookieJar.set(name, { value, options });
          }
        },
      },
    },
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError != null) {
    const login = new URL("/login", origin);
    login.searchParams.set("error", "confirmation_failed");
    const response = NextResponse.redirect(login);
    applyCookies(response, cookieJar);
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user == null) {
    const login = new URL("/login", origin);
    login.searchParams.set("error", "confirmation_failed");
    const response = NextResponse.redirect(login);
    applyCookies(response, cookieJar);
    return response;
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError != null || profile == null) {
    const login = new URL("/login", origin);
    login.searchParams.set("error", "missing_profile");
    const response = NextResponse.redirect(login);
    applyCookies(response, cookieJar);
    return response;
  }

  const role = (profile as { role: string }).role;
  if (!VALID_ROLES.has(role)) {
    const response = NextResponse.redirect(new URL("/", origin));
    applyCookies(response, cookieJar);
    return response;
  }

  const path = dashboardPathForRole(role);
  const response = NextResponse.redirect(new URL(path, origin));
  applyCookies(response, cookieJar);
  return response;
}
