"use server";

import { BillingRule } from "@prisma/client";
import { redirect } from "next/navigation";

import {
  requireActiveMembership,
  requireActiveOrganization,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";

const billingRules = Object.values(BillingRule);

async function requirePackageManager() {
  const organization = await requireActiveOrganization("/app/packages");
  const membership = await requireActiveMembership(
    organization.id,
    "/app/packages",
  );

  if (!hasOrganizationPermission(membership, "billing.manage")) {
    redirect("/app/packages?error=permission");
  }

  return organization;
}

function getPackagesRedirect(formData: FormData, fallback: string) {
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();

  return redirectTo.startsWith("/app/packages") ? redirectTo : fallback;
}

function getText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function getPrice(formData: FormData) {
  const value = Number.parseInt(String(formData.get("price") ?? ""), 10);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function getBillingRule(formData: FormData) {
  const value = String(formData.get("billingRule") ?? "").trim();

  return billingRules.includes(value as BillingRule)
    ? (value as BillingRule)
    : null;
}

async function requireProgram(organizationId: string, programId: string) {
  const program = await prisma.program.findFirst({
    where: {
      id: programId,
      organizationId,
    },
    select: { id: true },
  });

  if (!program) {
    redirect("/app/packages?error=program");
  }

  return program;
}

function getPackagePayload(formData: FormData) {
  return {
    billingRule: getBillingRule(formData),
    isActive: formData.get("isActive") === "on",
    name: getText(formData, "name"),
    price: getPrice(formData),
    programId: String(formData.get("programId") ?? "").trim(),
  };
}

export async function createPackage(formData: FormData) {
  const organization = await requirePackageManager();
  const data = getPackagePayload(formData);

  if (!data.name || data.name.length < 2) {
    redirect("/app/packages?error=name");
  }

  if (!data.programId) {
    redirect("/app/packages?error=program");
  }

  if (data.price === null || !data.billingRule) {
    redirect("/app/packages?error=package-data");
  }

  await requireProgram(organization.id, data.programId);

  await prisma.pricingPlan.create({
    data: {
      organizationId: organization.id,
      programId: data.programId,
      name: data.name,
      price: data.price,
      billingRule: data.billingRule,
      isActive: data.isActive,
    },
  });

  redirect("/app/packages?created=1");
}

export async function updatePackage(formData: FormData) {
  const organization = await requirePackageManager();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const data = getPackagePayload(formData);

  if (!data.name || data.name.length < 2) {
    redirect("/app/packages?error=name");
  }

  if (!data.programId) {
    redirect("/app/packages?error=program");
  }

  if (data.price === null || !data.billingRule) {
    redirect("/app/packages?error=package-data");
  }

  const pricingPlan = await prisma.pricingPlan.findFirst({
    where: {
      id: packageId,
      organizationId: organization.id,
    },
    select: { id: true },
  });

  if (!pricingPlan) {
    redirect("/app/packages?error=package");
  }

  await requireProgram(organization.id, data.programId);

  await prisma.pricingPlan.update({
    where: { id: pricingPlan.id },
    data: {
      programId: data.programId,
      name: data.name,
      price: data.price,
      billingRule: data.billingRule,
      isActive: data.isActive,
    },
  });

  redirect(getPackagesRedirect(formData, "/app/packages?updated=1"));
}

export async function deletePackage(formData: FormData) {
  const organization = await requirePackageManager();
  const packageId = String(formData.get("packageId") ?? "").trim();

  const pricingPlan = await prisma.pricingPlan.findFirst({
    where: {
      id: packageId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      _count: { select: { invoices: true } },
    },
  });

  if (!pricingPlan) {
    redirect("/app/packages?error=package");
  }

  if (pricingPlan._count.invoices > 0) {
    redirect("/app/packages?error=package-has-invoices");
  }

  await prisma.pricingPlan.delete({
    where: { id: pricingPlan.id },
  });

  redirect("/app/packages?deleted=1");
}
