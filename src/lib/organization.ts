import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { requireCurrentUser } from "@/lib/auth";
import { devAuthCookie, getDevAuthUser, isDevAuthEnabled } from "@/lib/dev-auth";
import { prisma } from "@/lib/prisma";

export const activeOrganizationCookie = "orbit_active_organization_id";

const getDevWorkspaceContext = cache(async function getDevWorkspaceContext() {
  if (!isDevAuthEnabled()) {
    return null;
  }

  const cookieStore = await cookies();
  const devEmail = cookieStore.get(devAuthCookie)?.value;
  const devUser = getDevAuthUser();

  if (devEmail !== devUser.email) {
    return null;
  }

  const activeOrganizationId = cookieStore.get(activeOrganizationCookie)?.value;
  const memberships = await prisma.membership.findMany({
    where: { user: { email: devUser.email } },
    include: {
      customRole: true,
      organization: true,
      user: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    const user = await prisma.user.upsert({
      where: { email: devUser.email },
      update: { name: devUser.name },
      create: {
        email: devUser.email,
        name: devUser.name,
      },
    });

    return {
      activeMembership: null,
      memberships,
      organization: null,
      organizations: [],
      user,
    };
  }

  const activeMembership =
    memberships.find(
      (membership) => membership.organizationId === activeOrganizationId,
    ) ?? memberships[0];

  return {
    activeMembership,
    memberships,
    organization: activeMembership.organization,
    organizations: memberships.map((membership) => ({
      ...membership.organization,
      role: membership.role,
    })),
    user: activeMembership.user,
  };
});

export const getOrganizationsForUser = cache(async function getOrganizationsForUser(
  userId: string,
) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: "desc" },
  });

  return memberships.map((membership) => ({
    ...membership.organization,
    role: membership.role,
  }));
});

export const getActiveOrganization = cache(async function getActiveOrganization(
  userId: string,
) {
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
});

export async function requireActiveOrganization(next = "/app/dashboard") {
  const devContext = await getDevWorkspaceContext();

  if (devContext) {
    if (!devContext.organization) {
      redirect("/onboarding/create-organization");
    }

    return devContext.organization;
  }

  const user = await requireCurrentUser(next);
  const organization = await getActiveOrganization(user.id);

  if (!organization) {
    redirect("/onboarding/create-organization");
  }

  return organization;
}

export async function requireActiveMembership(
  organizationId?: string,
  next = "/app/dashboard",
) {
  const devContext = await getDevWorkspaceContext();

  if (devContext) {
    const resolvedOrganizationId =
      organizationId ?? devContext.organization?.id ?? null;

    if (!resolvedOrganizationId) {
      redirect("/onboarding/create-organization");
    }

    const membership = devContext.memberships.find(
      (item) => item.organizationId === resolvedOrganizationId,
    );

    if (!membership) {
      redirect("/auth/sign-in?error=organization");
    }

    return membership;
  }

  const user = await requireCurrentUser(next);
  const activeOrganization =
    organizationId ? null : await getActiveOrganization(user.id);
  const resolvedOrganizationId = organizationId ?? activeOrganization?.id;

  if (!resolvedOrganizationId) {
    redirect("/onboarding/create-organization");
  }

  const membership = await prisma.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: resolvedOrganizationId,
        userId: user.id,
      },
    },
    include: {
      customRole: true,
      user: true,
    },
  });

  if (!membership) {
    redirect("/auth/sign-in?error=organization");
  }

  return membership;
}

export async function requireWorkspaceContext(next = "/app/dashboard") {
  const devContext = await getDevWorkspaceContext();

  if (devContext) {
    if (!devContext.activeMembership || !devContext.organization) {
      redirect("/onboarding/create-organization");
    }

    return {
      user: devContext.user,
      organization: devContext.organization,
      membership: devContext.activeMembership,
      organizations: devContext.organizations,
    };
  }

  const user = await requireCurrentUser(next);
  const cookieStore = await cookies();
  const activeOrganizationId = cookieStore.get(activeOrganizationCookie)?.value;

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: {
      customRole: true,
      organization: true,
      user: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    redirect("/onboarding/create-organization");
  }

  const activeMembership =
    memberships.find(
      (membership) => membership.organizationId === activeOrganizationId,
    ) ?? memberships[0];

  return {
    user,
    organization: activeMembership.organization,
    membership: activeMembership,
    organizations: memberships.map((membership) => ({
      ...membership.organization,
      role: membership.role,
    })),
  };
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
