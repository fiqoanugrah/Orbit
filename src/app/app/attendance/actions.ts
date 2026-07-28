"use server";

import {
  AttendanceStatus,
  EnrollmentStatus,
  Prisma,
} from "@prisma/client";
import { redirect } from "next/navigation";

import {
  requireActiveMembership,
  requireActiveOrganization,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";

const attendanceStatuses = Object.values(AttendanceStatus);

async function requireAttendanceManager() {
  const organization = await requireActiveOrganization("/app/attendance");
  const membership = await requireActiveMembership(
    organization.id,
    "/app/attendance",
  );

  if (!hasOrganizationPermission(membership, "attendance.manage")) {
    redirect("/app/attendance?error=permission");
  }

  return organization;
}

function getText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function getDate(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getAttendanceStatus(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  return attendanceStatuses.includes(value as AttendanceStatus)
    ? (value as AttendanceStatus)
    : null;
}

async function requireClassWithActiveEnrollments(
  organizationId: string,
  classId: string,
) {
  const classItem = await prisma.class.findFirst({
    where: { id: classId, organizationId },
    include: {
      enrollments: {
        where: { status: EnrollmentStatus.ACTIVE },
        select: { id: true },
      },
    },
  });

  if (!classItem) {
    redirect("/app/attendance?error=class");
  }

  return classItem;
}

async function requireAttendanceSession(
  organizationId: string,
  sessionId: string,
) {
  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, organizationId },
    include: {
      class: {
        include: {
          enrollments: {
            where: { status: EnrollmentStatus.ACTIVE },
            select: { id: true },
          },
        },
      },
      records: { select: { enrollmentId: true, id: true } },
    },
  });

  if (!session) {
    redirect("/app/attendance?error=session");
  }

  return session;
}

export async function createAttendanceSession(formData: FormData) {
  const organization = await requireAttendanceManager();
  const classId = String(formData.get("classId") ?? "").trim();
  const date = getDate(formData, "date");
  const notes = getText(formData, "notes");

  if (!classId || !date) {
    redirect("/app/attendance?error=session-data");
  }

  const classItem = await requireClassWithActiveEnrollments(
    organization.id,
    classId,
  );
  const existingSession = await prisma.attendanceSession.findUnique({
    where: { classId_date: { classId, date } },
    select: { id: true },
  });

  if (existingSession) {
    redirect("/app/attendance?error=duplicate");
  }

  await prisma.attendanceSession.create({
    data: {
      organizationId: organization.id,
      classId: classItem.id,
      date,
      notes,
      records: {
        create: classItem.enrollments.map((enrollment) => ({
          organizationId: organization.id,
          enrollmentId: enrollment.id,
          status: AttendanceStatus.PRESENT,
        })),
      },
    },
  });

  redirect("/app/attendance?created=1");
}

export async function updateAttendanceSession(formData: FormData) {
  const organization = await requireAttendanceManager();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const date = getDate(formData, "date");
  const notes = getText(formData, "notes");

  if (!sessionId || !date) {
    redirect("/app/attendance?error=session-data");
  }

  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, organizationId: organization.id },
    select: { classId: true, id: true },
  });

  if (!session) {
    redirect("/app/attendance?error=session");
  }

  const duplicateSession = await prisma.attendanceSession.findFirst({
    where: {
      classId: session.classId,
      date,
      NOT: { id: session.id },
    },
    select: { id: true },
  });

  if (duplicateSession) {
    redirect("/app/attendance?error=duplicate");
  }

  await prisma.attendanceSession.update({
    where: { id: session.id },
    data: { date, notes },
  });

  redirect("/app/attendance?updated=1");
}

export async function updateAttendanceRecords(formData: FormData) {
  const organization = await requireAttendanceManager();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const session = await requireAttendanceSession(organization.id, sessionId);

  const updates: Prisma.PrismaPromise<unknown>[] = [];

  for (const record of session.records) {
    const status = getAttendanceStatus(formData, `status-${record.id}`);

    if (!status) {
      redirect("/app/attendance?error=status");
    }

    updates.push(
      prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          status,
          notes: getText(formData, `notes-${record.id}`),
        },
      }),
    );
  }

  await prisma.$transaction(updates);

  redirect("/app/attendance?recordsUpdated=1");
}

export async function syncAttendanceRecords(formData: FormData) {
  const organization = await requireAttendanceManager();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const session = await requireAttendanceSession(organization.id, sessionId);
  const existingEnrollmentIds = new Set(
    session.records.map((record) => record.enrollmentId),
  );
  const missingEnrollments = session.class.enrollments.filter(
    (enrollment) => !existingEnrollmentIds.has(enrollment.id),
  );

  if (missingEnrollments.length > 0) {
    await prisma.attendanceRecord.createMany({
      data: missingEnrollments.map((enrollment) => ({
        organizationId: organization.id,
        sessionId: session.id,
        enrollmentId: enrollment.id,
        status: AttendanceStatus.PRESENT,
      })),
      skipDuplicates: true,
    });
  }

  redirect("/app/attendance?synced=1");
}

export async function deleteAttendanceSession(formData: FormData) {
  const organization = await requireAttendanceManager();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, organizationId: organization.id },
    select: { id: true },
  });

  if (!session) {
    redirect("/app/attendance?error=session");
  }

  await prisma.attendanceSession.delete({ where: { id: session.id } });

  redirect("/app/attendance?deleted=1");
}
