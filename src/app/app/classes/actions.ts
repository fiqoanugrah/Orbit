"use server";

import { HolidayAction } from "@prisma/client";
import { redirect } from "next/navigation";

import {
  requireActiveMembership,
  requireActiveOrganization,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";

async function requireClassesManager() {
  const organization = await requireActiveOrganization("/app/classes");
  const membership = await requireActiveMembership(
    organization.id,
    "/app/classes",
  );

  if (!hasOrganizationPermission(membership, "classes.manage")) {
    redirect("/app/classes?error=permission");
  }

  return organization;
}

function getText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function getPositiveInt(formData: FormData, key: string) {
  const value = Number.parseInt(String(formData.get(key) ?? ""), 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getOptionalPositiveInt(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    return null;
  }

  return getPositiveInt(formData, key);
}

function getDate(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getHolidayAction(formData: FormData) {
  const value = String(formData.get("action") ?? "").trim();

  return Object.values(HolidayAction).includes(value as HolidayAction)
    ? (value as HolidayAction)
    : null;
}

function getDayOfWeek(formData: FormData) {
  const value = Number.parseInt(String(formData.get("dayOfWeek") ?? ""), 10);
  return Number.isInteger(value) && value >= 0 && value <= 6 ? value : null;
}

function isValidTime(value: string | null) {
  return value ? /^([01]\d|2[0-3]):[0-5]\d$/.test(value) : false;
}

async function requireProgram(organizationId: string, programId: string) {
  const program = await prisma.program.findFirst({
    where: { id: programId, organizationId },
    select: { id: true },
  });

  if (!program) {
    redirect("/app/classes?error=program");
  }

  return program;
}

async function requireTeacher(organizationId: string, teacherId: string) {
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, organizationId },
    select: { id: true },
  });

  if (!teacher) {
    redirect("/app/classes?error=teacher");
  }

  return teacher;
}

async function requirePeriod(organizationId: string, academicPeriodId: string) {
  const period = await prisma.academicPeriod.findFirst({
    where: { id: academicPeriodId, organizationId },
    select: { id: true },
  });

  if (!period) {
    redirect("/app/classes?error=period");
  }

  return period;
}

async function requireRoom(organizationId: string, roomId: string | null) {
  if (!roomId) {
    return null;
  }

  const room = await prisma.room.findFirst({
    where: { id: roomId, organizationId },
    select: { id: true },
  });

  if (!room) {
    redirect("/app/classes?error=room");
  }

  return room;
}

function validatePeriodDates(startsAt: Date | null, endsAt: Date | null) {
  if (startsAt && endsAt && endsAt < startsAt) {
    redirect("/app/classes?error=period-dates");
  }
}

function getClassesRedirect(formData: FormData, fallback: string) {
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();

  return redirectTo.startsWith("/app/classes") ? redirectTo : fallback;
}

export async function createAcademicPeriod(formData: FormData) {
  const organization = await requireClassesManager();
  const name = getText(formData, "name");
  const startsAt = getDate(formData, "startsAt");
  const endsAt = getDate(formData, "endsAt");

  if (!name || name.length < 2) {
    redirect("/app/classes?error=period-name");
  }

  validatePeriodDates(startsAt, endsAt);

  const existingPeriod = await prisma.academicPeriod.findFirst({
    where: { organizationId: organization.id, name },
    select: { id: true },
  });

  if (existingPeriod) {
    redirect("/app/classes?error=period-exists");
  }

  await prisma.academicPeriod.create({
    data: {
      organizationId: organization.id,
      name,
      startsAt,
      endsAt,
    },
  });

  redirect("/app/classes?periodCreated=1");
}

export async function updateAcademicPeriod(formData: FormData) {
  const organization = await requireClassesManager();
  const academicPeriodId = String(
    formData.get("academicPeriodId") ?? "",
  ).trim();
  const name = getText(formData, "name");
  const startsAt = getDate(formData, "startsAt");
  const endsAt = getDate(formData, "endsAt");

  if (!name || name.length < 2) {
    redirect("/app/classes?error=period-name");
  }

  validatePeriodDates(startsAt, endsAt);
  await requirePeriod(organization.id, academicPeriodId);

  const existingPeriod = await prisma.academicPeriod.findFirst({
    where: {
      organizationId: organization.id,
      name,
      NOT: { id: academicPeriodId },
    },
    select: { id: true },
  });

  if (existingPeriod) {
    redirect("/app/classes?error=period-exists");
  }

  await prisma.academicPeriod.update({
    where: { id: academicPeriodId },
    data: { name, startsAt, endsAt },
  });

  redirect("/app/classes?periodUpdated=1");
}

export async function deleteAcademicPeriod(formData: FormData) {
  const organization = await requireClassesManager();
  const academicPeriodId = String(
    formData.get("academicPeriodId") ?? "",
  ).trim();

  const period = await prisma.academicPeriod.findFirst({
    where: { id: academicPeriodId, organizationId: organization.id },
    select: {
      id: true,
      _count: { select: { classes: true, enrollments: true, invoices: true } },
    },
  });

  if (!period) {
    redirect("/app/classes?error=period");
  }

  if (
    period._count.classes > 0 ||
    period._count.enrollments > 0 ||
    period._count.invoices > 0
  ) {
    redirect("/app/classes?error=period-has-records");
  }

  await prisma.academicPeriod.delete({ where: { id: period.id } });

  redirect("/app/classes?periodDeleted=1");
}

export async function createRoom(formData: FormData) {
  const organization = await requireClassesManager();
  const name = getText(formData, "name");
  const capacity = getOptionalPositiveInt(formData, "capacity");

  if (!name || name.length < 2) {
    redirect("/app/classes?error=room-name");
  }

  if (String(formData.get("capacity") ?? "").trim() && !capacity) {
    redirect("/app/classes?error=room-capacity");
  }

  const existingRoom = await prisma.room.findFirst({
    where: { organizationId: organization.id, name },
    select: { id: true },
  });

  if (existingRoom) {
    redirect("/app/classes?error=room-exists");
  }

  await prisma.room.create({
    data: { organizationId: organization.id, name, capacity },
  });

  redirect("/app/classes?roomCreated=1");
}

export async function updateRoom(formData: FormData) {
  const organization = await requireClassesManager();
  const roomId = String(formData.get("roomId") ?? "").trim();
  const name = getText(formData, "name");
  const capacity = getOptionalPositiveInt(formData, "capacity");

  if (!name || name.length < 2) {
    redirect("/app/classes?error=room-name");
  }

  if (String(formData.get("capacity") ?? "").trim() && !capacity) {
    redirect("/app/classes?error=room-capacity");
  }

  await requireRoom(organization.id, roomId);

  const existingRoom = await prisma.room.findFirst({
    where: {
      organizationId: organization.id,
      name,
      NOT: { id: roomId },
    },
    select: { id: true },
  });

  if (existingRoom) {
    redirect("/app/classes?error=room-exists");
  }

  await prisma.room.update({
    where: { id: roomId },
    data: { name, capacity },
  });

  redirect("/app/classes?roomUpdated=1");
}

export async function deleteRoom(formData: FormData) {
  const organization = await requireClassesManager();
  const roomId = String(formData.get("roomId") ?? "").trim();

  const room = await prisma.room.findFirst({
    where: { id: roomId, organizationId: organization.id },
    select: {
      id: true,
      _count: { select: { classes: true } },
    },
  });

  if (!room) {
    redirect("/app/classes?error=room");
  }

  if (room._count.classes > 0) {
    redirect("/app/classes?error=room-has-classes");
  }

  await prisma.room.delete({ where: { id: room.id } });

  redirect("/app/classes?roomDeleted=1");
}

export async function createHoliday(formData: FormData) {
  const organization = await requireClassesManager();
  const name = getText(formData, "name");
  const date = getDate(formData, "date");
  const action = getHolidayAction(formData);
  const notes = getText(formData, "notes");

  if (!name || name.length < 2) {
    redirect("/app/classes?error=holiday-name");
  }

  if (!date || !action) {
    redirect("/app/classes?error=holiday-data");
  }

  const existingHoliday = await prisma.holiday.findFirst({
    where: { organizationId: organization.id, date },
    select: { id: true },
  });

  if (existingHoliday) {
    redirect("/app/classes?error=holiday-exists");
  }

  await prisma.holiday.create({
    data: {
      organizationId: organization.id,
      name,
      date,
      action,
      notes,
    },
  });

  redirect("/app/classes?holidayCreated=1");
}

export async function updateHoliday(formData: FormData) {
  const organization = await requireClassesManager();
  const holidayId = String(formData.get("holidayId") ?? "").trim();
  const name = getText(formData, "name");
  const date = getDate(formData, "date");
  const action = getHolidayAction(formData);
  const notes = getText(formData, "notes");

  if (!name || name.length < 2) {
    redirect("/app/classes?error=holiday-name");
  }

  if (!date || !action) {
    redirect("/app/classes?error=holiday-data");
  }

  const holiday = await prisma.holiday.findFirst({
    where: { id: holidayId, organizationId: organization.id },
    select: { id: true },
  });

  if (!holiday) {
    redirect("/app/classes?error=holiday");
  }

  const existingHoliday = await prisma.holiday.findFirst({
    where: {
      organizationId: organization.id,
      date,
      NOT: { id: holiday.id },
    },
    select: { id: true },
  });

  if (existingHoliday) {
    redirect("/app/classes?error=holiday-exists");
  }

  await prisma.holiday.update({
    where: { id: holiday.id },
    data: { name, date, action, notes },
  });

  redirect("/app/classes?holidayUpdated=1");
}

export async function deleteHoliday(formData: FormData) {
  const organization = await requireClassesManager();
  const holidayId = String(formData.get("holidayId") ?? "").trim();

  const holiday = await prisma.holiday.findFirst({
    where: { id: holidayId, organizationId: organization.id },
    select: { id: true },
  });

  if (!holiday) {
    redirect("/app/classes?error=holiday");
  }

  await prisma.holiday.delete({ where: { id: holiday.id } });

  redirect("/app/classes?holidayDeleted=1");
}

function getClassPayload(formData: FormData) {
  const startsAt = getText(formData, "startsAt");
  const endsAt = getText(formData, "endsAt");

  return {
    academicPeriodId: String(formData.get("academicPeriodId") ?? "").trim(),
    dayOfWeek: getDayOfWeek(formData),
    endsAt,
    maxStudents: getPositiveInt(formData, "maxStudents"),
    name: getText(formData, "name"),
    programId: String(formData.get("programId") ?? "").trim(),
    roomId: String(formData.get("roomId") ?? "").trim() || null,
    startsAt,
    teacherId: String(formData.get("teacherId") ?? "").trim(),
  };
}

async function validateClassPayload(
  organizationId: string,
  data: ReturnType<typeof getClassPayload>,
) {
  if (!data.name || data.name.length < 2) {
    redirect("/app/classes?error=class-name");
  }

  if (
    !data.programId ||
    !data.teacherId ||
    !data.academicPeriodId ||
    data.dayOfWeek === null
  ) {
    redirect("/app/classes?error=class-data");
  }

  if (!isValidTime(data.startsAt)) {
    redirect("/app/classes?error=class-time");
  }

  if (data.endsAt && !isValidTime(data.endsAt)) {
    redirect("/app/classes?error=class-time");
  }

  if (data.endsAt && data.startsAt && data.endsAt <= data.startsAt) {
    redirect("/app/classes?error=class-time-order");
  }

  if (!data.maxStudents) {
    redirect("/app/classes?error=class-max");
  }

  await Promise.all([
    requireProgram(organizationId, data.programId),
    requireTeacher(organizationId, data.teacherId),
    requirePeriod(organizationId, data.academicPeriodId),
    requireRoom(organizationId, data.roomId),
  ]);
}

export async function createClass(formData: FormData) {
  const organization = await requireClassesManager();
  const data = getClassPayload(formData);

  await validateClassPayload(organization.id, data);

  await prisma.class.create({
    data: {
      organizationId: organization.id,
      programId: data.programId,
      teacherId: data.teacherId,
      roomId: data.roomId,
      academicPeriodId: data.academicPeriodId,
      name: data.name as string,
      dayOfWeek: data.dayOfWeek as number,
      startsAt: data.startsAt as string,
      endsAt: data.endsAt,
      maxStudents: data.maxStudents as number,
    },
  });

  redirect("/app/classes?created=1");
}

export async function updateClass(formData: FormData) {
  const organization = await requireClassesManager();
  const classId = String(formData.get("classId") ?? "").trim();
  const data = getClassPayload(formData);

  const classItem = await prisma.class.findFirst({
    where: { id: classId, organizationId: organization.id },
    select: { id: true },
  });

  if (!classItem) {
    redirect("/app/classes?error=class");
  }

  await validateClassPayload(organization.id, data);

  await prisma.class.update({
    where: { id: classItem.id },
    data: {
      programId: data.programId,
      teacherId: data.teacherId,
      roomId: data.roomId,
      academicPeriodId: data.academicPeriodId,
      name: data.name as string,
      dayOfWeek: data.dayOfWeek as number,
      startsAt: data.startsAt as string,
      endsAt: data.endsAt,
      maxStudents: data.maxStudents as number,
    },
  });

  redirect(getClassesRedirect(formData, "/app/classes?updated=1"));
}

export async function deleteClass(formData: FormData) {
  const organization = await requireClassesManager();
  const classId = String(formData.get("classId") ?? "").trim();

  const classItem = await prisma.class.findFirst({
    where: { id: classId, organizationId: organization.id },
    select: {
      id: true,
      _count: { select: { enrollments: true, sessions: true } },
    },
  });

  if (!classItem) {
    redirect("/app/classes?error=class");
  }

  if (classItem._count.enrollments > 0 || classItem._count.sessions > 0) {
    redirect("/app/classes?error=class-has-records");
  }

  await prisma.class.delete({ where: { id: classItem.id } });

  redirect("/app/classes?deleted=1");
}
