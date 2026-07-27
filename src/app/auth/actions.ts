"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { activeOrganizationCookie } from "@/lib/organization";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeNext(value: FormDataEntryValue | string | null) {
  const next = String(value ?? "/auth/sign-in").trim();

  if (!next.startsWith("/") || next.startsWith("//")) {
    return "/auth/sign-in";
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

  if (host?.includes("localhost") && process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

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

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(activeOrganizationCookie);

  redirect("/");
}
