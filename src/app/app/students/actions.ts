"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  requireActiveMembership,
  requireActiveOrganization,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";
import { saveStudentPhoto, UploadError } from "@/lib/upload";

export type StudentActionState = {
  message: string | null;
  status: "idle" | "error" | "success";
};

async function requireStudentsManager() {
  const organization = await requireActiveOrganization("/app/students");
  const membership = await requireActiveMembership(
    organization.id,
    "/app/students",
  );

  if (!hasOrganizationPermission(membership, "students.manage")) {
    redirect("/app/students?error=permission");
  }

  return organization;
}

function actionError(message: string): StudentActionState {
  return {
    message,
    status: "error",
  };
}

function actionSuccess(message: string): StudentActionState {
  revalidatePath("/app/students");

  return {
    message,
    status: "success",
  };
}

async function getParentId(organizationId: string, value: FormDataEntryValue | null) {
  const parentId = String(value ?? "").trim();

  if (!parentId) {
    return null;
  }

  const parent = await prisma.parent.findFirst({
    where: {
      id: parentId,
      organizationId,
    },
    select: { id: true },
  });

  return parent?.id ?? null;
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
    where: { id: levelId, organizationId, isActive: true },
    select: { id: true },
  });

  return level?.id ?? null;
}

function getDate(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function getStudentPayload(organizationId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const birthDateValue = String(formData.get("birthDate") ?? "").trim();
  const parentId = await getParentId(organizationId, formData.get("parentId"));
  const photo = formData.get("photo");
  const photoUrl = await saveStudentPhoto(
    photo instanceof File ? photo : null,
    organizationId,
  );

  return {
    name,
    parentId,
    birthDate: birthDateValue ? new Date(`${birthDateValue}T00:00:00`) : null,
    phone: phone || null,
    photoUrl,
    notes: notes || null,
  };
}

export async function createStudent(
  _prevState: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const organization = await requireStudentsManager();
  let data: Awaited<ReturnType<typeof getStudentPayload>>;

  try {
    data = await getStudentPayload(organization.id, formData);
  } catch (error) {
    if (error instanceof UploadError) {
      return actionError(error.message);
    }

    throw error;
  }

  if (data.name.length < 2) {
    return actionError("Nama student minimal 2 karakter.");
  }

  await prisma.student.create({
    data: {
      organizationId: organization.id,
      birthDate: data.birthDate,
      name: data.name,
      notes: data.notes,
      parentId: data.parentId,
      phone: data.phone,
      photoUrl: data.photoUrl,
    },
  });

  return actionSuccess("Student berhasil ditambahkan.");
}

export async function updateStudent(
  _prevState: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const organization = await requireStudentsManager();
  const studentId = String(formData.get("studentId") ?? "").trim();
  let data: Awaited<ReturnType<typeof getStudentPayload>>;

  try {
    data = await getStudentPayload(organization.id, formData);
  } catch (error) {
    if (error instanceof UploadError) {
      return actionError(error.message);
    }

    throw error;
  }

  if (data.name.length < 2) {
    return actionError("Nama student minimal 2 karakter.");
  }

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      organizationId: organization.id,
    },
    select: { id: true },
  });

  if (!student) {
    return actionError("Student tidak ditemukan.");
  }

  await prisma.student.update({
    where: { id: student.id },
    data: {
      birthDate: data.birthDate,
      name: data.name,
      notes: data.notes,
      parentId: data.parentId,
      phone: data.phone,
      ...(data.photoUrl ? { photoUrl: data.photoUrl } : {}),
    },
  });

  revalidatePath(`/app/students/${student.id}`);

  return actionSuccess("Student berhasil diperbarui.");
}

export async function deleteStudent(
  _prevState: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const organization = await requireStudentsManager();
  const studentId = String(formData.get("studentId") ?? "").trim();

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      _count: {
        select: {
          enrollments: true,
          invoices: true,
        },
      },
    },
  });

  if (!student) {
    return actionError("Student tidak ditemukan.");
  }

  if (student._count.enrollments > 0 || student._count.invoices > 0) {
    return actionError("Student masih punya enrollment atau invoice.");
  }

  await prisma.student.delete({
    where: { id: student.id },
  });

  return actionSuccess("Student berhasil dihapus.");
}

export async function updateStudentLevel(formData: FormData) {
  const organization = await requireStudentsManager();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const levelId = await getAcademicLevelId(
    organization.id,
    formData.get("levelId"),
  );
  const effectiveAt = getDate(formData, "effectiveAt") ?? new Date();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const redirectTo = `/app/students/${studentId}`;

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      organizationId: organization.id,
    },
    select: { currentLevelId: true, id: true },
  });

  if (!student) {
    redirect("/app/students?error=student");
  }

  if (student.currentLevelId === levelId) {
    redirect(`${redirectTo}?levelUnchanged=1`);
  }

  await prisma.$transaction([
    prisma.student.update({
      where: { id: student.id },
      data: { currentLevelId: levelId },
    }),
    prisma.studentLevelHistory.create({
      data: {
        organizationId: organization.id,
        studentId: student.id,
        fromLevelId: student.currentLevelId,
        toLevelId: levelId,
        effectiveAt,
        notes,
      },
    }),
  ]);

  revalidatePath(redirectTo);
  redirect(`${redirectTo}?levelUpdated=1`);
}
