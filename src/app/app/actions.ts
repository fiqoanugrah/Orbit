"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  activeOrganizationCookie,
  requireActiveOrganization,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { saveOrganizationPhoto } from "@/lib/upload";

export async function switchOrganization(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });

  if (!organization) {
    redirect("/auth/sign-in?error=organization");
  }

  const cookieStore = await cookies();
  cookieStore.set(activeOrganizationCookie, organization.id, {
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
