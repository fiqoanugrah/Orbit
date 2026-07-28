import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { cache } from "react";

import { devAuthCookie, getDevAuthUser, isDevAuthEnabled } from "@/lib/dev-auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getDisplayName(metadata: Record<string, unknown>, email: string) {
  const name =
    metadata.full_name ?? metadata.name ?? metadata.display_name ?? email;

  return String(name).trim() || email;
}

export const getCurrentUser = cache(async function getCurrentUser() {
  if (isDevAuthEnabled()) {
    const cookieStore = await cookies();
    const devEmail = cookieStore.get(devAuthCookie)?.value;
    const devUser = getDevAuthUser();

    if (devEmail === devUser.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: devUser.email },
      });

      if (existingUser) {
        return existingUser;
      }

      return prisma.user.create({
        data: {
          email: devUser.email,
          name: devUser.name,
        },
      });
    }
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  return prisma.user.upsert({
    where: { email: user.email },
    update: {
      name: getDisplayName(user.user_metadata, user.email),
    },
    create: {
      email: user.email,
      name: getDisplayName(user.user_metadata, user.email),
    },
  });
});

export async function requireCurrentUser(next = "/app/dashboard") {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  return user;
}
