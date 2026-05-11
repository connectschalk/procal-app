/**
 * OAuth PKCE callback (and legacy email confirmation links that still point here).
 *
 * **New sign-ups:** `signup-form` sets `emailRedirectTo` to `/auth/confirmed` so users
 * land on the branded activation page (modal + onboarding routing) instead of this route.
 *
 * Keep this route in Supabase **Redirect URLs** for OAuth and older confirmation links.
 * Email template may use `{{ .ConfirmationURL }}` with `redirect_to` matching your Site URL.
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

  const basePath = dashboardPathForRole(role);
  /** Post–email-confirmation: welcome modal on company/talent dashboards (not admin). */
  const destination =
    role === "admin" ? basePath : `${basePath}?welcome=1`;
  const response = NextResponse.redirect(new URL(destination, origin));
  applyCookies(response, cookieJar);
  return response;
}
