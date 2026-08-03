"use server";

import { redirect } from "next/navigation";

import {
  requireActiveMembership,
  requireActiveOrganization,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";

async function requireProgramsManager() {
  const organization = await requireActiveOrganization("/app/programs");
  const membership = await requireActiveMembership(
    organization.id,
    "/app/programs",
  );

  if (!hasOrganizationPermission(membership, "classes.manage")) {
    redirect("/app/programs?error=permission");
  }

  return organization;
}

function getProgramsRedirect(formData: FormData, fallback: string) {
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();

  return redirectTo.startsWith("/app/programs") ? redirectTo : fallback;
}

function getText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function getPositiveInt(formData: FormData, key: string) {
  const value = Number.parseInt(String(formData.get(key) ?? ""), 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

async function requireCategory(organizationId: string, categoryId: string) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      organizationId,
    },
    select: { id: true },
  });

  if (!category) {
    redirect("/app/programs?error=category");
  }

  return category;
}

async function getAcademicLevelId(
  organizationId: string,
  value: FormDataEntryValue | null,
) {
  const levelId = String(value ?? "").trim();

  if (!levelId) {
    return null;
  }

  const level = await prisma.academicLevel.findFirst({
    where: { id: levelId, organizationId },
    select: { id: true },
  });

  return level?.id ?? null;
}

async function requireAcademicLevel(organizationId: string, levelId: string) {
  const level = await prisma.academicLevel.findFirst({
    where: { id: levelId, organizationId },
    select: {
      id: true,
      _count: { select: { currentStudents: true, programs: true } },
    },
  });

  if (!level) {
    redirect("/app/programs?error=level");
  }

  return level;
}

export async function createCategory(formData: FormData) {
  const organization = await requireProgramsManager();
  const name = getText(formData, "name");
  const description = getText(formData, "description");

  if (!name || name.length < 2) {
    redirect("/app/programs?error=category-name");
  }

  const existingCategory = await prisma.category.findFirst({
    where: {
      organizationId: organization.id,
      name,
    },
    select: { id: true },
  });

  if (existingCategory) {
    redirect("/app/programs?error=category-exists");
  }

  await prisma.category.create({
    data: {
      organizationId: organization.id,
      name,
      description,
    },
  });

  redirect("/app/programs?categoryCreated=1");
}

export async function updateCategory(formData: FormData) {
  const organization = await requireProgramsManager();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const name = getText(formData, "name");
  const description = getText(formData, "description");

  if (!name || name.length < 2) {
    redirect("/app/programs?error=category-name");
  }

  await requireCategory(organization.id, categoryId);

  const existingCategory = await prisma.category.findFirst({
    where: {
      organizationId: organization.id,
      name,
      NOT: { id: categoryId },
    },
    select: { id: true },
  });

  if (existingCategory) {
    redirect("/app/programs?error=category-exists");
  }

  await prisma.category.update({
    where: { id: categoryId },
    data: {
      name,
      description,
    },
  });

  redirect("/app/programs?categoryUpdated=1");
}

export async function deleteCategory(formData: FormData) {
  const organization = await requireProgramsManager();
  const categoryId = String(formData.get("categoryId") ?? "").trim();

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      _count: { select: { programs: true } },
    },
  });

  if (!category) {
    redirect("/app/programs?error=category");
  }

  if (category._count.programs > 0) {
    redirect("/app/programs?error=category-has-programs");
  }

  await prisma.category.delete({
    where: { id: category.id },
  });

  redirect("/app/programs?categoryDeleted=1");
}

export async function createLevel(formData: FormData) {
  const organization = await requireProgramsManager();
  const name = getText(formData, "name");
  const description = getText(formData, "description");
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);

  if (!name || name.length < 2) {
    redirect("/app/programs?error=level-name");
  }

  const existingLevel = await prisma.academicLevel.findFirst({
    where: { organizationId: organization.id, name },
    select: { id: true },
  });

  if (existingLevel) {
    redirect("/app/programs?error=level-exists");
  }

  await prisma.academicLevel.create({
    data: {
      organizationId: organization.id,
      name,
      description,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    },
  });

  redirect("/app/programs?levelCreated=1");
}

export async function updateLevel(formData: FormData) {
  const organization = await requireProgramsManager();
  const levelId = String(formData.get("levelId") ?? "").trim();
  const name = getText(formData, "name");
  const description = getText(formData, "description");
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive = formData.get("isActive") === "on";

  if (!name || name.length < 2) {
    redirect("/app/programs?error=level-name");
  }

  await requireAcademicLevel(organization.id, levelId);

  const existingLevel = await prisma.academicLevel.findFirst({
    where: {
      organizationId: organization.id,
      name,
      NOT: { id: levelId },
    },
    select: { id: true },
  });

  if (existingLevel) {
    redirect("/app/programs?error=level-exists");
  }

  await prisma.academicLevel.update({
    where: { id: levelId },
    data: {
      name,
      description,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      isActive,
    },
  });

  redirect("/app/programs?levelUpdated=1");
}

export async function deleteLevel(formData: FormData) {
  const organization = await requireProgramsManager();
  const levelId = String(formData.get("levelId") ?? "").trim();
  const level = await requireAcademicLevel(organization.id, levelId);

  if (level._count.programs > 0 || level._count.currentStudents > 0) {
    redirect("/app/programs?error=level-has-records");
  }

  await prisma.academicLevel.delete({ where: { id: level.id } });

  redirect("/app/programs?levelDeleted=1");
}

function getProgramPayload(formData: FormData) {
  const name = getText(formData, "name");
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const sessionDuration = getPositiveInt(formData, "sessionDuration");
  const totalSessions = getPositiveInt(formData, "totalSessions");
  const maxStudents = getPositiveInt(formData, "maxStudents");

  return {
    academicLevelId: String(formData.get("academicLevelId") ?? "").trim(),
    categoryId,
    description: getText(formData, "description"),
    maxStudents,
    name,
    sessionDuration,
    totalSessions,
  };
}

export async function createProgram(formData: FormData) {
  const organization = await requireProgramsManager();
  const data = getProgramPayload(formData);

  if (!data.name || data.name.length < 2) {
    redirect("/app/programs?error=program-name");
  }

  if (!data.categoryId) {
    redirect("/app/programs?error=category");
  }

  if (!data.sessionDuration || !data.totalSessions || !data.maxStudents) {
    redirect("/app/programs?error=program-numbers");
  }

  await requireCategory(organization.id, data.categoryId);
  const academicLevelId = await getAcademicLevelId(
    organization.id,
    data.academicLevelId,
  );

  await prisma.program.create({
    data: {
      organizationId: organization.id,
      categoryId: data.categoryId,
      academicLevelId,
      name: data.name,
      sessionDuration: data.sessionDuration,
      totalSessions: data.totalSessions,
      maxStudents: data.maxStudents,
      description: data.description,
    },
  });

  redirect("/app/programs?created=1");
}

export async function updateProgram(formData: FormData) {
  const organization = await requireProgramsManager();
  const programId = String(formData.get("programId") ?? "").trim();
  const data = getProgramPayload(formData);

  if (!data.name || data.name.length < 2) {
    redirect("/app/programs?error=program-name");
  }

  if (!data.categoryId) {
    redirect("/app/programs?error=category");
  }

  if (!data.sessionDuration || !data.totalSessions || !data.maxStudents) {
    redirect("/app/programs?error=program-numbers");
  }

  const program = await prisma.program.findFirst({
    where: {
      id: programId,
      organizationId: organization.id,
    },
    select: { id: true },
  });

  if (!program) {
    redirect("/app/programs?error=program");
  }

  await requireCategory(organization.id, data.categoryId);
  const academicLevelId = await getAcademicLevelId(
    organization.id,
    data.academicLevelId,
  );

  await prisma.program.update({
    where: { id: program.id },
    data: {
      categoryId: data.categoryId,
      academicLevelId,
      name: data.name,
      sessionDuration: data.sessionDuration,
      totalSessions: data.totalSessions,
      maxStudents: data.maxStudents,
      description: data.description,
    },
  });

  redirect(getProgramsRedirect(formData, "/app/programs?updated=1"));
}

export async function deleteProgram(formData: FormData) {
  const organization = await requireProgramsManager();
  const programId = String(formData.get("programId") ?? "").trim();

  const program = await prisma.program.findFirst({
    where: {
      id: programId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      _count: { select: { classes: true, pricingPlans: true } },
    },
  });

  if (!program) {
    redirect("/app/programs?error=program");
  }

  if (program._count.classes > 0 || program._count.pricingPlans > 0) {
    redirect("/app/programs?error=program-has-records");
  }

  await prisma.program.delete({
    where: { id: program.id },
  });

  redirect("/app/programs?deleted=1");
}
