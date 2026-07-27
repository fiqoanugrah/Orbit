import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getDisplayName(metadata: Record<string, unknown>, email: string) {
  const name =
    metadata.full_name ?? metadata.name ?? metadata.display_name ?? email;

  return String(name).trim() || email;
}

export async function getCurrentUser() {
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
}

export async function requireCurrentUser(next = "/app/dashboard") {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  return user;
}
