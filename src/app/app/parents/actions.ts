"use server";

import { redirect } from "next/navigation";

import {
  requireActiveMembership,
  requireActiveOrganization,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";

async function requireParentsManager() {
  const organization = await requireActiveOrganization("/app/parents");
  const membership = await requireActiveMembership(
    organization.id,
    "/app/parents",
  );

  if (!hasOrganizationPermission(membership, "students.manage")) {
    redirect("/app/parents?error=permission");
  }

  return organization;
}

function getParentPayload(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const address = String(formData.get("address") ?? "").trim();

  return {
    name,
    phone: phone || null,
    email: email || null,
    address: address || null,
  };
}

function getParentsRedirect(formData: FormData, fallback: string) {
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();

  return redirectTo.startsWith("/app/parents") ? redirectTo : fallback;
}

export async function createParent(formData: FormData) {
  const organization = await requireParentsManager();
  const data = getParentPayload(formData);

  if (data.name.length < 2) {
    redirect("/app/parents?error=name");
  }

  await prisma.parent.create({
    data: {
      organizationId: organization.id,
      ...data,
    },
  });

  redirect("/app/parents?created=1");
}

export async function updateParent(formData: FormData) {
  const organization = await requireParentsManager();
  const parentId = String(formData.get("parentId") ?? "").trim();
  const data = getParentPayload(formData);

  if (data.name.length < 2) {
    redirect("/app/parents?error=name");
  }

  const parent = await prisma.parent.findFirst({
    where: {
      id: parentId,
      organizationId: organization.id,
    },
    select: { id: true },
  });

  if (!parent) {
    redirect("/app/parents?error=parent");
  }

  await prisma.parent.update({
    where: { id: parent.id },
    data,
  });

  redirect(getParentsRedirect(formData, "/app/parents?updated=1"));
}

export async function deleteParent(formData: FormData) {
  const organization = await requireParentsManager();
  const parentId = String(formData.get("parentId") ?? "").trim();

  const parent = await prisma.parent.findFirst({
    where: {
      id: parentId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      _count: { select: { students: true } },
    },
  });

  if (!parent) {
    redirect("/app/parents?error=parent");
  }

  if (parent._count.students > 0) {
    redirect("/app/parents?error=parent-has-students");
  }

  await prisma.parent.delete({
    where: { id: parent.id },
  });

  redirect("/app/parents?deleted=1");
}
