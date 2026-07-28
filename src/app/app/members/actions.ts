"use server";

import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import {
  requireActiveMembership,
  requireActiveOrganization,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { canManageOrganizationMembers } from "@/lib/roles";

function getSafeRole(value: FormDataEntryValue | null) {
  const role = String(value ?? "TEACHER");

  if (role === "OWNER" || role === "ADMIN" || role === "TEACHER") {
    return role;
  }

  return UserRole.TEACHER;
}

async function requireMemberManager() {
  const organization = await requireActiveOrganization("/app/members");
  const membership = await requireActiveMembership(
    organization.id,
    "/app/members",
  );

  if (!canManageOrganizationMembers(membership)) {
    redirect("/app/members?error=permission");
  }

  return { organization, membership };
}

async function getCustomRoleId(organizationId: string, value: FormDataEntryValue | null) {
  const customRoleId = String(value ?? "").trim();

  if (!customRoleId) {
    return null;
  }

  const customRole = await prisma.organizationRole.findFirst({
    where: {
      id: customRoleId,
      organizationId,
    },
    select: { id: true },
  });

  return customRole?.id ?? null;
}

async function countOwners(organizationId: string) {
  return prisma.membership.count({
    where: {
      organizationId,
      role: UserRole.OWNER,
    },
  });
}

export async function addOrganizationMember(formData: FormData) {
  const { organization } = await requireMemberManager();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = getSafeRole(formData.get("role"));
  const customRoleId = await getCustomRoleId(
    organization.id,
    formData.get("customRoleId"),
  );

  if (!email.includes("@")) {
    redirect("/app/members?error=email");
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      ...(name ? { name } : {}),
    },
    create: {
      email,
      name: name || email,
    },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: {
      role,
      customRoleId,
    },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role,
      customRoleId,
    },
  });

  redirect("/app/members?added=1");
}

export async function updateOrganizationMemberRole(formData: FormData) {
  const { organization } = await requireMemberManager();
  const membershipId = String(formData.get("membershipId") ?? "").trim();
  const role = getSafeRole(formData.get("role"));
  const customRoleId = await getCustomRoleId(
    organization.id,
    formData.get("customRoleId"),
  );

  const targetMembership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!targetMembership) {
    redirect("/app/members?error=member");
  }

  if (
    targetMembership.role === UserRole.OWNER &&
    role !== UserRole.OWNER &&
    (await countOwners(organization.id)) <= 1
  ) {
    redirect("/app/members?error=last-owner");
  }

  await prisma.membership.update({
    where: { id: targetMembership.id },
    data: {
      role,
      customRoleId,
    },
  });

  redirect("/app/members?updated=1");
}

export async function removeOrganizationMember(formData: FormData) {
  const { organization, membership } = await requireMemberManager();
  const membershipId = String(formData.get("membershipId") ?? "").trim();

  const targetMembership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      role: true,
      userId: true,
    },
  });

  if (!targetMembership) {
    redirect("/app/members?error=member");
  }

  if (
    targetMembership.role === UserRole.OWNER &&
    (await countOwners(organization.id)) <= 1
  ) {
    redirect("/app/members?error=last-owner");
  }

  if (targetMembership.userId === membership.userId) {
    redirect("/app/members?error=self-remove");
  }

  await prisma.membership.delete({
    where: { id: targetMembership.id },
  });

  redirect("/app/members?removed=1");
}
