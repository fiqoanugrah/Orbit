"use server";

import { EnrollmentStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import {
  requireActiveMembership,
  requireActiveOrganization,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";

const enrollmentStatuses = Object.values(EnrollmentStatus);

async function requireEnrollmentsManager() {
  const organization = await requireActiveOrganization("/app/enrollments");
  const membership = await requireActiveMembership(
    organization.id,
    "/app/enrollments",
  );

  if (!hasOrganizationPermission(membership, "students.manage")) {
    redirect("/app/enrollments?error=permission");
  }

  return organization;
}

function getDate(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getStatus(formData: FormData) {
  const value = String(formData.get("status") ?? "").trim();

  return enrollmentStatuses.includes(value as EnrollmentStatus)
    ? (value as EnrollmentStatus)
    : null;
}

async function requireStudent(organizationId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, organizationId },
    select: { id: true },
  });

  if (!student) {
    redirect("/app/enrollments?error=student");
  }

  return student;
}

async function requireClass(organizationId: string, classId: string) {
  const classItem = await prisma.class.findFirst({
    where: { id: classId, organizationId },
    select: { academicPeriodId: true, id: true, maxStudents: true },
  });

  if (!classItem) {
    redirect("/app/enrollments?error=class");
  }

  return classItem;
}

function getEnrollmentPayload(formData: FormData) {
  const joinedAt = getDate(formData, "joinedAt") ?? new Date();
  const endedAt = getDate(formData, "endedAt");

  return {
    classId: String(formData.get("classId") ?? "").trim(),
    endedAt,
    joinedAt,
    status: getStatus(formData),
    studentId: String(formData.get("studentId") ?? "").trim(),
  };
}

async function validateEnrollmentPayload(
  organizationId: string,
  data: ReturnType<typeof getEnrollmentPayload>,
  existingEnrollmentId?: string,
) {
  if (!data.studentId || !data.classId || !data.status) {
    redirect("/app/enrollments?error=enrollment-data");
  }

  if (data.endedAt && data.endedAt < data.joinedAt) {
    redirect("/app/enrollments?error=enrollment-dates");
  }

  await requireStudent(organizationId, data.studentId);
  const classItem = await requireClass(organizationId, data.classId);

  const duplicateEnrollment = await prisma.enrollment.findFirst({
    where: {
      academicPeriodId: classItem.academicPeriodId,
      classId: data.classId,
      studentId: data.studentId,
      ...(existingEnrollmentId ? { NOT: { id: existingEnrollmentId } } : {}),
    },
    select: { id: true },
  });

  if (duplicateEnrollment) {
    redirect("/app/enrollments?error=duplicate");
  }

  return classItem;
}

export async function createEnrollment(formData: FormData) {
  const organization = await requireEnrollmentsManager();
  const data = getEnrollmentPayload(formData);
  const classItem = await validateEnrollmentPayload(organization.id, data);

  await prisma.enrollment.create({
    data: {
      organizationId: organization.id,
      studentId: data.studentId,
      classId: data.classId,
      academicPeriodId: classItem.academicPeriodId,
      status: data.status as EnrollmentStatus,
      joinedAt: data.joinedAt,
      endedAt: data.endedAt,
    },
  });

  redirect("/app/enrollments?created=1");
}

export async function updateEnrollment(formData: FormData) {
  const organization = await requireEnrollmentsManager();
  const enrollmentId = String(formData.get("enrollmentId") ?? "").trim();
  const data = getEnrollmentPayload(formData);

  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, organizationId: organization.id },
    select: { id: true },
  });

  if (!enrollment) {
    redirect("/app/enrollments?error=enrollment");
  }

  const classItem = await validateEnrollmentPayload(
    organization.id,
    data,
    enrollment.id,
  );

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      studentId: data.studentId,
      classId: data.classId,
      academicPeriodId: classItem.academicPeriodId,
      status: data.status as EnrollmentStatus,
      joinedAt: data.joinedAt,
      endedAt: data.endedAt,
    },
  });

  redirect("/app/enrollments?updated=1");
}

export async function deleteEnrollment(formData: FormData) {
  const organization = await requireEnrollmentsManager();
  const enrollmentId = String(formData.get("enrollmentId") ?? "").trim();

  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, organizationId: organization.id },
    select: {
      id: true,
      _count: { select: { attendance: true, invoices: true } },
    },
  });

  if (!enrollment) {
    redirect("/app/enrollments?error=enrollment");
  }

  if (enrollment._count.attendance > 0 || enrollment._count.invoices > 0) {
    redirect("/app/enrollments?error=enrollment-has-records");
  }

  await prisma.enrollment.delete({ where: { id: enrollment.id } });

  redirect("/app/enrollments?deleted=1");
}
