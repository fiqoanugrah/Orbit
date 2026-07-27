import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const activeOrganizationCookie = "orbit_active_organization_id";

export async function getOrganizationsForUser(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: "desc" },
  });

  return memberships.map((membership) => ({
    ...membership.organization,
    role: membership.role,
  }));
}

export async function getActiveOrganization(userId: string) {
  const cookieStore = await cookies();
  const activeOrganizationId = cookieStore.get(activeOrganizationCookie)?.value;

  if (activeOrganizationId) {
    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: activeOrganizationId,
          userId,
        },
      },
      include: { organization: true },
    });

    if (membership) {
      return membership.organization;
    }
  }

  const firstMembership = await prisma.membership.findFirst({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  if (!firstMembership) {
    return null;
  }

  return firstMembership.organization;
}

export async function requireActiveOrganization() {
  const user = await requireCurrentUser("/app/dashboard");
  const organization = await getActiveOrganization(user.id);

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
