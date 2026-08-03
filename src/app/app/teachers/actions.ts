"use server";

import { redirect } from "next/navigation";

import {
  requireActiveMembership,
  requireActiveOrganization,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";
import { saveTeacherPhoto, UploadError } from "@/lib/upload";

async function requireTeachersManager() {
  const organization = await requireActiveOrganization("/app/teachers");
  const membership = await requireActiveMembership(
    organization.id,
    "/app/teachers",
  );

  if (!hasOrganizationPermission(membership, "classes.manage")) {
    redirect("/app/teachers?error=permission");
  }

  return organization;
}

function getTeachersRedirect(formData: FormData, fallback: string) {
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();

  return redirectTo.startsWith("/app/teachers") ? redirectTo : fallback;
}

function withStatusParam(path: string, key: string, value: string) {
  const url = new URL(path, "http://orbit.local");
  url.searchParams.delete("created");
  url.searchParams.delete("updated");
  url.searchParams.delete("deleted");
  url.searchParams.set(key, value);

  return `${url.pathname}${url.search}`;
}

async function getTeacherPayload(organizationId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const photo = formData.get("photo");
  const photoUrl = await saveTeacherPhoto(
    photo instanceof File ? photo : null,
    organizationId,
  );

  return {
    name,
    phone: phone || null,
    email: email || null,
    photoUrl,
  };
}

export async function createTeacher(formData: FormData) {
  const organization = await requireTeachersManager();
  let data: Awaited<ReturnType<typeof getTeacherPayload>>;

  try {
    data = await getTeacherPayload(organization.id, formData);
  } catch (error) {
    if (error instanceof UploadError) {
      redirect("/app/teachers?error=photo");
    }

    throw error;
  }

  if (data.name.length < 2) {
    redirect("/app/teachers?error=name");
  }

  await prisma.teacher.create({
    data: {
      organizationId: organization.id,
      email: data.email,
      name: data.name,
      phone: data.phone,
      photoUrl: data.photoUrl,
    },
  });

  redirect("/app/teachers?created=1");
}

export async function updateTeacher(formData: FormData) {
  const organization = await requireTeachersManager();
  const teacherId = String(formData.get("teacherId") ?? "").trim();
  const redirectTo = getTeachersRedirect(formData, "/app/teachers?updated=1");
  let data: Awaited<ReturnType<typeof getTeacherPayload>>;

  try {
    data = await getTeacherPayload(organization.id, formData);
  } catch (error) {
    if (error instanceof UploadError) {
      redirect(withStatusParam(redirectTo, "error", "photo"));
    }

    throw error;
  }

  if (data.name.length < 2) {
    redirect("/app/teachers?error=name");
  }

  const teacher = await prisma.teacher.findFirst({
    where: {
      id: teacherId,
      organizationId: organization.id,
    },
    select: { id: true },
  });

  if (!teacher) {
    redirect("/app/teachers?error=teacher");
  }

  await prisma.teacher.update({
    where: { id: teacher.id },
    data: {
      email: data.email,
      name: data.name,
      phone: data.phone,
      ...(data.photoUrl ? { photoUrl: data.photoUrl } : {}),
    },
  });

  redirect(redirectTo);
}

export async function deleteTeacher(formData: FormData) {
  const organization = await requireTeachersManager();
  const teacherId = String(formData.get("teacherId") ?? "").trim();

  const teacher = await prisma.teacher.findFirst({
    where: {
      id: teacherId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      _count: { select: { classes: true } },
    },
  });

  if (!teacher) {
    redirect("/app/teachers?error=teacher");
  }

  if (teacher._count.classes > 0) {
    redirect("/app/teachers?error=teacher-has-classes");
  }

  await prisma.teacher.delete({
    where: { id: teacher.id },
  });

  redirect("/app/teachers?deleted=1");
}
