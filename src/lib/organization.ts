import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

export const activeOrganizationCookie = "orbit_active_organization_id";

export async function getActiveOrganization() {
  const cookieStore = await cookies();
  const activeOrganizationId = cookieStore.get(activeOrganizationCookie)?.value;

  if (activeOrganizationId) {
    const organization = await prisma.organization.findUnique({
      where: { id: activeOrganizationId },
    });

    if (organization) {
      return organization;
    }
  }

  const firstOrganization = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!firstOrganization) {
    return null;
  }

  return firstOrganization;
}

export async function requireActiveOrganization() {
  const organization = await getActiveOrganization();

  if (!organization) {
    redirect("/onboarding/create-organization");
  }

  return organization;
}

export function createSlug(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "tempat-les";
}

export async function createUniqueSlug(name: string) {
  const baseSlug = createSlug(name);
  let slug = baseSlug;
  let suffix = 2;

  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}
