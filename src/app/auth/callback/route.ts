import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getCurrentUser } from "@/lib/auth";
import { activeOrganizationCookie } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app/dashboard";
  }

  return value;
}

async function resolvePostLoginPath(userId: string, next: string) {
  const isAuthEntryPage = ["/auth/sign-in", "/auth/sign-up"].includes(next);
  const wantsAppPage = next.startsWith("/app");

  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { organizationId: true },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0 && (isAuthEntryPage || wantsAppPage)) {
    return "/onboarding/create-organization";
  }

  if (memberships.length === 1 && (isAuthEntryPage || wantsAppPage)) {
    const cookieStore = await cookies();
    cookieStore.set(activeOrganizationCookie, memberships[0].organizationId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return wantsAppPage ? next : "/app/dashboard";
  }

  return isAuthEntryPage ? "/auth/sign-in" : next;
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
      const user = await getCurrentUser();

      if (!user) {
        return NextResponse.redirect(
          new URL("/auth/auth-code-error?error=user", requestUrl.origin),
        );
      }

      const redirectPath = await resolvePostLoginPath(user.id, next);

      return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
    }

    console.error("Supabase OAuth code exchange failed", {
      message: exchangeError.message,
      origin: requestUrl.origin,
    });
  }

  return NextResponse.redirect(new URL("/auth/auth-code-error", requestUrl.origin));
}
