import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/auth/sign-in";
  }

  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNext(requestUrl.searchParams.get("next"));
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (error) {
    console.error("Supabase OAuth callback error", {
      error,
      errorDescription,
      origin: requestUrl.origin,
    });

    return NextResponse.redirect(
      new URL(
        `/auth/auth-code-error?error=${encodeURIComponent(error)}`,
        requestUrl.origin,
      ),
    );
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      await getCurrentUser();

      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    console.error("Supabase OAuth code exchange failed", {
      message: exchangeError.message,
      origin: requestUrl.origin,
    });
  }

  return NextResponse.redirect(new URL("/auth/auth-code-error", requestUrl.origin));
}
