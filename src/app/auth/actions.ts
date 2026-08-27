"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { activeOrganizationCookie } from "@/lib/organization";
import { devAuthCookie, getDevAuthUser, isDevAuthEnabled } from "@/lib/dev-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeNext(value: FormDataEntryValue | string | null) {
  const next = String(value ?? "/app/dashboard").trim();

  if (!next.startsWith("/") || next.startsWith("//")) {
    return "/app/dashboard";
  }

  return next;
}

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");

  return host
    ? `${protocol}://${host}`
    : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
        /\/$/,
        "",
      );
}

export async function signInWithGoogle(formData: FormData) {
  const next = getSafeNext(formData.get("next"));
  const origin = await getRequestOrigin();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    redirect("/auth/sign-in?error=google");
  }

  redirect(data.url);
}

export async function signInAsDevUser(formData: FormData) {
  if (!isDevAuthEnabled()) {
    redirect("/auth/sign-in?error=dev");
  }

  const next = getSafeNext(formData.get("next"));
  const cookieStore = await cookies();
  const devUser = getDevAuthUser();

  cookieStore.set(devAuthCookie, devUser.email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect(next);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(activeOrganizationCookie);
  cookieStore.delete(devAuthCookie);

  redirect("/");
}
