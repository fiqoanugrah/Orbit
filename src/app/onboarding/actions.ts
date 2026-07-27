"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  activeOrganizationCookie,
  createUniqueSlug,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { seedOrganizationWorkspace } from "@/lib/seed-organization";
import { saveOrganizationPhoto } from "@/lib/upload";

export async function createOrganization(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "Asia/Jakarta").trim();
  const photo = formData.get("photo");

  if (name.length < 2) {
    redirect("/onboarding/create-organization?error=name");
  }

  if (!ownerName || !ownerEmail) {
    redirect("/onboarding/create-organization?error=owner");
  }

  const organization = await prisma.organization.create({
    data: {
      name,
      slug: await createUniqueSlug(name),
      phone: phone || null,
      email: email || null,
      address: address || null,
      photoUrl: await saveOrganizationPhoto(photo instanceof File ? photo : null),
      timezone: timezone || "Asia/Jakarta",
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { name: ownerName },
    create: {
      name: ownerName,
      email: ownerEmail,
    },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: owner.id,
      },
    },
    update: { role: "OWNER" },
    create: {
      organizationId: organization.id,
      userId: owner.id,
      role: "OWNER",
    },
  });

  await seedOrganizationWorkspace(organization.id);

  const cookieStore = await cookies();
  cookieStore.set(activeOrganizationCookie, organization.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect("/app/dashboard");
}
