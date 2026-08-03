"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  activeOrganizationCookie,
  createUniqueSlug,
} from "@/lib/organization";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultOrganizationRoles } from "@/lib/roles";
import {
  saveOrganizationPhoto,
  UploadError,
  validatePhotoFile,
} from "@/lib/upload";

export async function createOrganization(formData: FormData) {
  const owner = await requireCurrentUser("/onboarding/create-organization");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "Asia/Jakarta").trim();
  const photo = formData.get("photo");

  if (name.length < 2) {
    redirect("/onboarding/create-organization?error=name");
  }

  try {
    validatePhotoFile(photo instanceof File ? photo : null, "Organization");
  } catch (error) {
    if (error instanceof UploadError) {
      redirect("/onboarding/create-organization?error=photo");
    }

    throw error;
  }

  const organization = await prisma.organization.create({
    data: {
      name,
      slug: await createUniqueSlug(name),
      phone: phone || null,
      email: email || null,
      address: address || null,
      timezone: timezone || "Asia/Jakarta",
    },
  });

  const photoUrl = await saveOrganizationPhoto(
    photo instanceof File ? photo : null,
    organization.id,
  );

  if (photoUrl) {
    await prisma.organization.update({
      where: { id: organization.id },
      data: { photoUrl },
    });
  }

  const { ownerRole } = await ensureDefaultOrganizationRoles(organization.id);

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: owner.id,
      },
    },
    update: { role: "OWNER", customRoleId: ownerRole.id },
    create: {
      organizationId: organization.id,
      userId: owner.id,
      role: "OWNER",
      customRoleId: ownerRole.id,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(activeOrganizationCookie, organization.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect("/app/dashboard");
}
