"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  activeOrganizationCookie,
  requireActiveOrganization,
} from "@/lib/organization";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveOrganizationPhoto } from "@/lib/upload";

export async function switchOrganization(formData: FormData) {
  const user = await requireCurrentUser("/auth/sign-in");
  const organizationId = String(formData.get("organizationId") ?? "");
  const membership = await prisma.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: user.id,
      },
    },
    select: { organizationId: true },
  });

  if (!membership) {
    redirect("/auth/sign-in?error=organization");
  }

  const cookieStore = await cookies();
  cookieStore.set(activeOrganizationCookie, membership.organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect("/app/dashboard");
}

export async function updateOrganizationProfile(formData: FormData) {
  const organization = await requireActiveOrganization();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "Asia/Jakarta").trim();
  const photo = formData.get("photo");
  const photoUrl = await saveOrganizationPhoto(
    photo instanceof File ? photo : null,
  );

  if (name.length < 2) {
    redirect("/app/profile?error=name");
  }

  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      name,
      phone: phone || null,
      email: email || null,
      address: address || null,
      timezone: timezone || "Asia/Jakarta",
      ...(photoUrl ? { photoUrl } : {}),
    },
  });

  redirect("/app/profile?updated=1");
}
