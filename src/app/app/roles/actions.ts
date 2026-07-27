"use server";

import { redirect } from "next/navigation";

import { organizationPermissions } from "@/lib/roles";
import {
  requireActiveMembership,
  requireActiveOrganization,
} from "@/lib/organization";
import { canManageOrganizationRoles } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function createOrganizationRole(formData: FormData) {
  const organization = await requireActiveOrganization();
  const membership = await requireActiveMembership(organization.id);

  if (!canManageOrganizationRoles(membership.role)) {
    redirect("/app/roles?error=permission");
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const requestedPermissions = formData
    .getAll("permissions")
    .map((permission) => String(permission));
  const allowedPermissions = new Set<string>(
    organizationPermissions.map((permission) => permission.key),
  );
  const permissions = requestedPermissions.filter((permission) =>
    allowedPermissions.has(permission),
  );

  if (name.length < 2) {
    redirect("/app/roles?error=name");
  }

  await prisma.organizationRole.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name,
      },
    },
    update: {
      description: description || null,
      permissions,
      isSystem: false,
    },
    create: {
      organizationId: organization.id,
      name,
      description: description || null,
      permissions,
      isSystem: false,
    },
  });

  redirect("/app/roles?created=1");
}
