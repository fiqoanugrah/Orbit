import { HolidayAction } from "@prisma/client";
import Link from "next/link";
import {
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  Clock3,
  DoorOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { AppPageShell } from "@/app/app/app-page-shell";
import {
  createAcademicPeriod,
  createClass,
  createHoliday,
  createRoom,
  deleteAcademicPeriod,
  deleteClass,
  deleteHoliday,
  deleteRoom,
  updateAcademicPeriod,
  updateClass,
  updateHoliday,
  updateRoom,
} from "@/app/app/classes/actions";
import { ListSearch } from "@/components/list-search";
import { PendingButton } from "@/components/pending-button";
import { requireWorkspaceContext } from "@/lib/organization";
import {
  formOptionLimit,
  normalizeSearchParam,
  pageListLimit,
} from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";

export const dynamic = "force-dynamic";

const dayLabels = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

const statusMessages = {
  created: "Class berhasil ditambahkan.",
  deleted: "Class berhasil dihapus.",
  holidayCreated: "Holiday berhasil ditambahkan.",
  holidayDeleted: "Holiday berhasil dihapus.",
  holidayUpdated: "Holiday berhasil diperbarui.",
  periodCreated: "Academic period berhasil ditambahkan.",
  periodDeleted: "Academic period berhasil dihapus.",
  periodUpdated: "Academic period berhasil diperbarui.",
  roomCreated: "Room berhasil ditambahkan.",
  roomDeleted: "Room berhasil dihapus.",
  roomUpdated: "Room berhasil diperbarui.",
  updated: "Class berhasil diperbarui.",
} as const;

const errorMessages = {
  class: "Class tidak ditemukan.",
  "class-data": "Program, teacher, period, dan hari wajib dipilih.",
  "class-has-records": "Class sudah punya enrollment atau attendance session.",
  "class-max": "Max student wajib lebih dari 0.",
  "class-name": "Nama class minimal 2 karakter.",
  "class-time": "Jam class wajib format HH:MM.",
  "class-time-order": "Jam selesai harus setelah jam mulai.",
  holiday: "Holiday tidak ditemukan.",
  "holiday-data": "Tanggal dan action holiday wajib valid.",
  "holiday-exists": "Tanggal holiday sudah dipakai.",
  "holiday-name": "Nama holiday minimal 2 karakter.",
  period: "Academic period tidak ditemukan.",
  "period-dates": "Tanggal selesai period harus setelah tanggal mulai.",
  "period-exists": "Nama academic period sudah dipakai.",
  "period-has-records": "Academic period masih dipakai class, enrollment, atau invoice.",
  "period-name": "Nama academic period minimal 2 karakter.",
  permission: "Akun kamu belum bisa mengelola class di organization ini.",
  program: "Program tidak ditemukan.",
  room: "Room tidak ditemukan.",
  "room-capacity": "Capacity room wajib lebih dari 0.",
  "room-exists": "Nama room sudah dipakai.",
  "room-has-classes": "Room masih dipakai class.",
  "room-name": "Nama room minimal 2 karakter.",
  teacher: "Teacher tidak ditemukan.",
} as const;

type ClassesSearchParams = {
  created?: string;
  deleted?: string;
  error?: keyof typeof errorMessages;
  holidayCreated?: string;
  holidayDeleted?: string;
  holidayUpdated?: string;
  periodCreated?: string;
  periodDeleted?: string;
  periodUpdated?: string;
  q?: string;
  roomCreated?: string;
  roomDeleted?: string;
  roomUpdated?: string;
  updated?: string;
};

function statusKey(params: ClassesSearchParams) {
  return (
    [
      "created",
      "updated",
      "deleted",
      "holidayCreated",
      "holidayUpdated",
      "holidayDeleted",
      "periodCreated",
      "periodUpdated",
      "periodDeleted",
      "roomCreated",
      "roomUpdated",
      "roomDeleted",
    ] as const
  ).find((key) => params[key]);
}

const holidayActionLabels = {
  SKIP: "Skip class",
  SHIFT_NEXT: "Shift next day",
} satisfies Record<HolidayAction, string>;

const eventTones = [
  "border-[#b7d4ff] bg-[#eef5ff] text-[#075bc9]",
  "border-[#ead3ff] bg-[#f7efff] text-[#6e3ab2]",
  "border-[#ffd9ad] bg-[#fff7ed] text-[#a45700]",
  "border-[#c8ead8] bg-[#f1fbf6] text-[#16834a]",
  "border-[#ffcaca] bg-[#fff4f4] text-[#c73535]",
] as const;

function toDateInputValue(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function formatDate(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(value)
    : null;
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const diff = (date.getDay() + 6) % 7;
  return addDays(date, -diff);
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function endOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0);
}

function monthTitle(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(value);
}

function shortDay(value: Date) {
  return new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(value);
}

function dayNumber(value: Date) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit" }).format(value);
}

function dateInputValue(value: Date) {
  return dateKey(value);
}

function isClassActiveOnDate(
  classItem: {
    academicPeriod: { startsAt: Date | null; endsAt: Date | null };
    dayOfWeek: number;
  },
  date: Date,
) {
  if (classItem.dayOfWeek !== date.getDay()) {
    return false;
  }

  const key = dateKey(date);
  const startsAt = classItem.academicPeriod.startsAt
    ? dateKey(classItem.academicPeriod.startsAt)
    : null;
  const endsAt = classItem.academicPeriod.endsAt
    ? dateKey(classItem.academicPeriod.endsAt)
    : null;

  return (!startsAt || key >= startsAt) && (!endsAt || key <= endsAt);
}

function monthCalendarDays(value: Date) {
  const first = startOfMonth(value);
  const firstGridDay = startOfWeek(first);

  return Array.from({ length: 42 }, (_, index) => addDays(firstGridDay, index));
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<ClassesSearchParams>;
}) {
  const params = await searchParams;
  const { organization, membership, organizations } =
    await requireWorkspaceContext("/app/classes");
  const canManageClasses = hasOrganizationPermission(
    membership,
    "classes.manage",
  );
  const activeStatus = statusKey(params);
  const query = normalizeSearchParam(params.q);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = startOfWeek(today);
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );
  const monthEnd = endOfMonth(today);
  const holidayRangeStart = addDays(weekStart, -7);
  const holidayRangeEnd = addDays(monthEnd, 14);
  const classWhere = {
    organizationId: organization.id,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            {
              program: {
                name: { contains: query, mode: "insensitive" as const },
              },
            },
            {
              teacher: {
                name: { contains: query, mode: "insensitive" as const },
              },
            },
            {
              room: {
                name: { contains: query, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };

  const [programs, teachers, periods, rooms, classes, calendarClasses, holidays] =
    await Promise.all([
    prisma.program.findMany({
      where: { organizationId: organization.id },
      include: { category: true },
      orderBy: { name: "asc" },
      take: formOptionLimit,
    }),
    prisma.teacher.findMany({
      where: { organizationId: organization.id },
      orderBy: { name: "asc" },
      take: formOptionLimit,
    }),
    prisma.academicPeriod.findMany({
      where: { organizationId: organization.id },
      include: {
        _count: { select: { classes: true, enrollments: true, invoices: true } },
      },
      orderBy: { createdAt: "desc" },
      take: formOptionLimit,
    }),
    prisma.room.findMany({
      where: { organizationId: organization.id },
      include: { _count: { select: { classes: true } } },
      orderBy: { name: "asc" },
      take: formOptionLimit,
    }),
    prisma.class.findMany({
      where: classWhere,
      include: {
        academicPeriod: true,
        program: { include: { category: true } },
        room: true,
        teacher: true,
        _count: { select: { enrollments: true, sessions: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startsAt: "asc" }],
      take: pageListLimit,
    }),
    prisma.class.findMany({
      where: { organizationId: organization.id },
      include: {
        academicPeriod: true,
        program: true,
        room: true,
        teacher: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startsAt: "asc" }],
      take: formOptionLimit,
    }),
    prisma.holiday.findMany({
      where: {
        organizationId: organization.id,
        date: {
          gte: holidayRangeStart,
          lte: holidayRangeEnd,
        },
      },
      orderBy: { date: "asc" },
      take: formOptionLimit,
    }),
  ]);
  const canCreateClass =
    canManageClasses &&
    programs.length > 0 &&
    teachers.length > 0 &&
    periods.length > 0;
  const holidaysByDate = new Map(
    holidays.map((holiday) => [dateKey(holiday.date), holiday]),
  );
  const nextOpenDate = (date: Date) => {
    let next = addDays(date, 1);

    for (let index = 0; index < 14; index += 1) {
      if (!holidaysByDate.has(dateKey(next))) {
        return next;
      }

      next = addDays(next, 1);
    }

    return addDays(date, 1);
  };
  const calendarEvents = calendarClasses.flatMap((classItem, index) =>
    weekDays.flatMap((date) => {
      if (!isClassActiveOnDate(classItem, date)) {
        return [];
      }

      const holiday = holidaysByDate.get(dateKey(date));

      if (holiday?.action === "SKIP") {
        return [];
      }

      const resolvedDate =
        holiday?.action === "SHIFT_NEXT" ? nextOpenDate(date) : date;

      return [
        {
          classItem,
          date: resolvedDate,
          holiday,
          originalDate: date,
          tone: eventTones[index % eventTones.length],
        },
      ];
    }),
  );
  const eventsByDate = new Map(
    weekDays.map((date) => [
      dateKey(date),
      calendarEvents
        .filter((event) => dateKey(event.date) === dateKey(date))
        .sort((a, b) => a.classItem.startsAt.localeCompare(b.classItem.startsAt)),
    ]),
  );
  const skippedClasses = calendarClasses.flatMap((classItem) =>
    weekDays.flatMap((date) => {
      const holiday = holidaysByDate.get(dateKey(date));

      return holiday?.action === "SKIP" && isClassActiveOnDate(classItem, date)
        ? [{ classItem, date, holiday }]
        : [];
    }),
  );
  const upcomingHolidays = holidays.filter(
    (holiday) => dateKey(holiday.date) >= dateKey(today),
  );

  return (
    <AppPageShell
      activePath="/app/classes"
      activeRole={membership.customRole?.name ?? membership.role}
      eyebrow="Classes"
      organization={organization}
      organizations={organizations}
      title="Class Schedule"
    >
      <div className="mx-auto max-w-7xl">
        {activeStatus ? (
          <div className="mb-5 flex items-center gap-2 rounded-md bg-[#e7f8ef] px-3 py-2 text-sm font-semibold text-[#16834a]">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {statusMessages[activeStatus]}
          </div>
        ) : null}

        {params.error ? (
          <div className="mb-5 rounded-md bg-[#ffecec] px-3 py-2 text-sm font-medium text-[#c73535]">
            {errorMessages[params.error] ?? "Action belum berhasil."}
          </div>
        ) : null}

        <section className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-[#e6edf5] pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase text-[#f5a623]">
                  Calendar
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  Jadwal Minggu Ini
                </h2>
                <p className="mt-1 text-sm text-[#6b7890]">
                  Holiday otomatis membuat class hilang atau bergeser sesuai
                  rule yang dipilih.
                </p>
              </div>
              <div className="rounded-md border border-[#d7e0ea] bg-[#fbfcfe] px-3 py-2 text-sm font-semibold text-[#536174]">
                {dayNumber(weekDays[0])} - {dayNumber(weekDays[6])}{" "}
                {monthTitle(today)}
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <div className="grid min-w-[760px] grid-cols-7 overflow-hidden rounded-md border border-[#dfe6ef]">
                {weekDays.map((date) => {
                  const holiday = holidaysByDate.get(dateKey(date));
                  const events = eventsByDate.get(dateKey(date)) ?? [];
                  const isToday = dateKey(date) === dateKey(today);

                  return (
                    <div
                      key={dateKey(date)}
                      className="min-h-[360px] border-r border-[#e6edf5] bg-white last:border-r-0"
                    >
                      <div
                        className={`border-b border-[#e6edf5] px-3 py-3 ${
                          isToday ? "bg-[#eef5ff]" : "bg-[#fbfcfe]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold uppercase text-[#6b7890]">
                              {shortDay(date)}
                            </p>
                            <p className="mt-1 text-lg font-semibold">
                              {date.getDate()}
                            </p>
                          </div>
                          {holiday ? (
                            <span className="rounded-md bg-[#fff3d8] px-2 py-1 text-[10px] font-semibold text-[#a56600]">
                              Holiday
                            </span>
                          ) : null}
                        </div>
                        {holiday ? (
                          <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-4 text-[#a56600]">
                            {holiday.name} - {holidayActionLabels[holiday.action]}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-2 p-2">
                        {events.length === 0 ? (
                          <div className="rounded-md border border-dashed border-[#e6edf5] px-2 py-6 text-center text-xs text-[#9aa7b8]">
                            No class
                          </div>
                        ) : null}

                        {events.map((event) => (
                          <Link
                            key={`${event.classItem.id}-${dateKey(
                              event.originalDate,
                            )}`}
                            href={`/app/classes/${event.classItem.id}`}
                            className={`rounded-md border p-3 ${event.tone}`}
                          >
                            <p className="text-xs font-bold">
                              {event.classItem.startsAt}
                              {event.classItem.endsAt
                                ? ` - ${event.classItem.endsAt}`
                                : ""}
                            </p>
                            <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5">
                              {event.classItem.name}
                            </h3>
                            <p className="mt-1 line-clamp-1 text-xs opacity-80">
                              {event.classItem.program.name}
                            </p>
                            <p className="mt-1 line-clamp-1 text-xs opacity-80">
                              {event.classItem.teacher.name}
                              {event.classItem.room
                                ? ` - ${event.classItem.room.name}`
                                : ""}
                            </p>
                            {event.holiday?.action === "SHIFT_NEXT" ? (
                              <p className="mt-2 rounded-sm bg-white/70 px-2 py-1 text-[10px] font-semibold">
                                Shifted from {formatDate(event.originalDate)}
                              </p>
                            ) : null}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {skippedClasses.length > 0 ? (
              <div className="mt-4 rounded-md border border-[#ffe4b8] bg-[#fffaf0] p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#9c6400]">
                  <CalendarOff className="size-4" aria-hidden="true" />
                  Class yang otomatis hilang minggu ini
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {skippedClasses.map((item) => (
                    <div
                      key={`${item.classItem.id}-${dateKey(item.date)}`}
                      className="rounded-md bg-white px-3 py-2 text-xs text-[#536174]"
                    >
                      <span className="font-semibold text-[#172033]">
                        {formatDate(item.date)}
                      </span>{" "}
                      - {item.classItem.name} karena {item.holiday.name}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="grid gap-6">
            <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#e6edf5] pb-4">
                <div>
                  <h2 className="text-lg font-semibold">{monthTitle(today)}</h2>
                  <p className="mt-1 text-sm text-[#6b7890]">
                    Mini calendar holiday
                  </p>
                </div>
                <CalendarDays
                  className="size-5 text-[#0b6ffb]"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs">
                {["M", "S", "S", "R", "K", "J", "S"].map((day, index) => (
                  <span
                    key={`${day}-${index}`}
                    className="py-1 font-semibold text-[#6b7890]"
                  >
                    {day}
                  </span>
                ))}
                {monthCalendarDays(today).map((date) => {
                  const key = dateKey(date);
                  const holiday = holidaysByDate.get(key);
                  const inMonth = date.getMonth() === today.getMonth();
                  const isToday = key === dateKey(today);

                  return (
                    <span
                      key={key}
                      title={holiday?.name}
                      className={`grid aspect-square place-items-center rounded-md font-semibold ${
                        holiday
                          ? "bg-[#fff3d8] text-[#a56600]"
                          : isToday
                            ? "bg-[#eaf2ff] text-[#075bc9]"
                            : inMonth
                              ? "text-[#536174]"
                              : "text-[#c6ceda]"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  );
                })}
              </div>
            </section>

            <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
              <div className="border-b border-[#e6edf5] pb-4">
                <h2 className="text-lg font-semibold">Holiday Settings</h2>
                <p className="mt-1 text-sm text-[#6b7890]">
                  Atur tanggal merah untuk jadwal class.
                </p>
              </div>

              <form action={createHoliday} className="grid gap-3 pt-4">
                <input
                  name="name"
                  required
                  minLength={2}
                  disabled={!canManageClasses}
                  placeholder="Libur nasional"
                  className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={dateInputValue(today)}
                  disabled={!canManageClasses}
                  className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
                <select
                  name="action"
                  required
                  defaultValue="SKIP"
                  disabled={!canManageClasses}
                  className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                >
                  {Object.entries(holidayActionLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  name="notes"
                  disabled={!canManageClasses}
                  placeholder="Catatan optional"
                  className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
                <PendingButton
                  disabled={!canManageClasses}
                  className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                  pendingChildren="Adding holiday..."
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add Holiday
                </PendingButton>
              </form>

              <div className="mt-5 grid gap-3">
                {upcomingHolidays.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[#d7e0ea] p-4 text-center text-sm text-[#6b7890]">
                    Belum ada holiday mendatang.
                  </div>
                ) : null}

                {upcomingHolidays.map((holiday) => (
                  <article
                    key={holiday.id}
                    className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">
                          {holiday.name}
                        </h3>
                        <p className="mt-1 text-xs text-[#6b7890]">
                          {formatDate(holiday.date)} -{" "}
                          {holidayActionLabels[holiday.action]}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md bg-[#fff3d8] px-2 py-1 text-[10px] font-semibold text-[#a56600]">
                        Holiday
                      </span>
                    </div>
                    <details className="mt-3 border-t border-[#e6edf5] pt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-[#536174]">
                        Edit holiday
                      </summary>
                      <form action={updateHoliday} className="mt-3 grid gap-2">
                        <input
                          type="hidden"
                          name="holidayId"
                          value={holiday.id}
                        />
                        <input
                          name="name"
                          required
                          minLength={2}
                          defaultValue={holiday.name}
                          disabled={!canManageClasses}
                          className="h-9 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <input
                          name="date"
                          type="date"
                          required
                          defaultValue={toDateInputValue(holiday.date)}
                          disabled={!canManageClasses}
                          className="h-9 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <select
                          name="action"
                          required
                          defaultValue={holiday.action}
                          disabled={!canManageClasses}
                          className="h-9 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        >
                          {Object.entries(holidayActionLabels).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                        <input
                          name="notes"
                          defaultValue={holiday.notes ?? ""}
                          disabled={!canManageClasses}
                          className="h-9 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <PendingButton
                          disabled={!canManageClasses}
                          className="h-9 rounded-md border border-[#d7e0ea] bg-white px-3 text-xs font-semibold text-[#536174] transition hover:bg-[#f1f5f9] disabled:cursor-wait disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          pendingChildren="Saving..."
                        >
                          Save Holiday
                        </PendingButton>
                      </form>
                    </details>
                    <form action={deleteHoliday} className="mt-3">
                      <input
                        type="hidden"
                        name="holidayId"
                        value={holiday.id}
                      />
                      <PendingButton
                        disabled={!canManageClasses}
                        className="flex h-8 w-full items-center justify-center gap-2 rounded-md border border-[#f4c6c6] bg-white px-3 text-xs font-semibold text-[#c73535] transition hover:bg-[#fff4f4] disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:text-[#d8a4a4]"
                        pendingChildren="Deleting..."
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                        Delete Holiday
                      </PendingButton>
                    </form>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <div className="grid gap-6">
          <div className="hidden gap-6">
            <details className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-lg font-semibold">
                <span>Tambah Class</span>
                <span className="rounded-md bg-[#0b6ffb] px-3 py-2 text-sm font-semibold text-white">
                  Open Form
                </span>
              </summary>
              <section className="pt-5">
              <div className="border-b border-[#e6edf5] pb-5">
                <h2 className="text-lg font-semibold">Tambah Class</h2>
                <p className="mt-1 text-sm text-[#6b7890]">
                  Class mengikat program, teacher, period, room, dan jadwal.
                </p>
              </div>

              <form action={createClass} className="grid gap-4 pt-5">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Nama class</span>
                  <input
                    name="name"
                    required
                    minLength={2}
                    disabled={!canCreateClass}
                    placeholder="Robotics Gold - Sabtu Pagi"
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Program</span>
                    <select
                      name="programId"
                      required
                      disabled={!canCreateClass}
                      defaultValue=""
                      className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    >
                      <option value="" disabled>
                        Pilih program
                      </option>
                      {programs.map((program) => (
                        <option key={program.id} value={program.id}>
                          {program.name} - {program.category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Teacher</span>
                    <select
                      name="teacherId"
                      required
                      disabled={!canCreateClass}
                      defaultValue=""
                      className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    >
                      <option value="" disabled>
                        Pilih teacher
                      </option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Academic period</span>
                    <select
                      name="academicPeriodId"
                      required
                      disabled={!canCreateClass}
                      defaultValue=""
                      className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    >
                      <option value="" disabled>
                        Pilih period
                      </option>
                      {periods.map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Room</span>
                    <select
                      name="roomId"
                      disabled={!canCreateClass}
                      defaultValue=""
                      className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    >
                      <option value="">Tanpa room</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Hari</span>
                    <select
                      name="dayOfWeek"
                      required
                      disabled={!canCreateClass}
                      defaultValue=""
                      className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    >
                      <option value="" disabled>
                        Pilih
                      </option>
                      {dayLabels.map((day, index) => (
                        <option key={day} value={index}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Mulai</span>
                    <input
                      name="startsAt"
                      type="time"
                      required
                      disabled={!canCreateClass}
                      className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Selesai</span>
                    <input
                      name="endsAt"
                      type="time"
                      disabled={!canCreateClass}
                      className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Max</span>
                    <input
                      name="maxStudents"
                      type="number"
                      min={1}
                      required
                      disabled={!canCreateClass}
                      placeholder="8"
                      className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                  </label>
                </div>

                <PendingButton
                  disabled={!canCreateClass}
                  className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                  pendingChildren="Menambahkan class..."
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Tambah Class
                </PendingButton>
              </form>
              </section>
            </details>

            <div className="grid gap-6 md:grid-cols-2">
              <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
                <div className="border-b border-[#e6edf5] pb-5">
                  <h2 className="text-lg font-semibold">Academic Period</h2>
                  <p className="mt-1 text-sm text-[#6b7890]">
                    {periods.length} period tersedia.
                  </p>
                </div>

                <form action={createAcademicPeriod} className="grid gap-3 pt-5">
                  <input
                    name="name"
                    required
                    minLength={2}
                    disabled={!canManageClasses}
                    placeholder="Semester 1 2026"
                    className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                    <input
                      name="startsAt"
                      type="date"
                      disabled={!canManageClasses}
                      className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                    <input
                      name="endsAt"
                      type="date"
                      disabled={!canManageClasses}
                      className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                  </div>
                  <PendingButton
                    disabled={!canManageClasses}
                    className="h-10 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                    pendingChildren="Adding..."
                  >
                    Add Period
                  </PendingButton>
                </form>

                <div className="mt-5 grid gap-3">
                  {periods.map((period) => {
                    const locked =
                      period._count.classes > 0 ||
                      period._count.enrollments > 0 ||
                      period._count.invoices > 0;

                    return (
                      <article
                        key={period.id}
                        className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold">
                              {period.name}
                            </h3>
                            <p className="mt-1 text-xs text-[#6b7890]">
                              {formatDate(period.startsAt) || "No start"} -{" "}
                              {formatDate(period.endsAt) || "No end"}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                            {period._count.classes} class
                          </span>
                        </div>
                        <details className="mt-3 border-t border-[#e6edf5] pt-3">
                          <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#536174]">
                            <Pencil className="size-3.5" aria-hidden="true" />
                            Edit period
                          </summary>
                          <form
                            action={updateAcademicPeriod}
                            className="mt-3 grid gap-2"
                          >
                            <input
                              type="hidden"
                              name="academicPeriodId"
                              value={period.id}
                            />
                            <input
                              name="name"
                              required
                              minLength={2}
                              defaultValue={period.name}
                              disabled={!canManageClasses}
                              className="h-9 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                            />
                            <input
                              name="startsAt"
                              type="date"
                              defaultValue={toDateInputValue(period.startsAt)}
                              disabled={!canManageClasses}
                              className="h-9 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                            />
                            <input
                              name="endsAt"
                              type="date"
                              defaultValue={toDateInputValue(period.endsAt)}
                              disabled={!canManageClasses}
                              className="h-9 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                            />
                            <PendingButton
                              disabled={!canManageClasses}
                              className="h-9 rounded-md border border-[#d7e0ea] bg-white px-3 text-xs font-semibold text-[#536174] transition hover:bg-[#f1f5f9] disabled:cursor-wait disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                              pendingChildren="Saving..."
                            >
                              Save Period
                            </PendingButton>
                          </form>
                        </details>
                        <form action={deleteAcademicPeriod} className="mt-3">
                          <input
                            type="hidden"
                            name="academicPeriodId"
                            value={period.id}
                          />
                          <PendingButton
                            disabled={!canManageClasses || locked}
                            className="flex h-8 items-center gap-2 rounded-md border border-[#f4c6c6] bg-white px-3 text-xs font-semibold text-[#c73535] transition hover:bg-[#fff4f4] disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:text-[#d8a4a4]"
                            pendingChildren="Deleting..."
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                            Delete Period
                          </PendingButton>
                        </form>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
                <div className="border-b border-[#e6edf5] pb-5">
                  <h2 className="text-lg font-semibold">Rooms</h2>
                  <p className="mt-1 text-sm text-[#6b7890]">
                    {rooms.length} room tersedia.
                  </p>
                </div>

                <form action={createRoom} className="grid gap-3 pt-5">
                  <input
                    name="name"
                    required
                    minLength={2}
                    disabled={!canManageClasses}
                    placeholder="Room A"
                    className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                  <input
                    name="capacity"
                    type="number"
                    min={1}
                    disabled={!canManageClasses}
                    placeholder="Capacity"
                    className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                  <PendingButton
                    disabled={!canManageClasses}
                    className="h-10 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                    pendingChildren="Adding..."
                  >
                    Add Room
                  </PendingButton>
                </form>

                <div className="mt-5 grid gap-3">
                  {rooms.map((room) => (
                    <article
                      key={room.id}
                      className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold">
                            {room.name}
                          </h3>
                          <p className="mt-1 text-xs text-[#6b7890]">
                            Capacity {room.capacity ?? "-"}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                          {room._count.classes} class
                        </span>
                      </div>
                      <details className="mt-3 border-t border-[#e6edf5] pt-3">
                        <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#536174]">
                          <Pencil className="size-3.5" aria-hidden="true" />
                          Edit room
                        </summary>
                        <form action={updateRoom} className="mt-3 grid gap-2">
                          <input type="hidden" name="roomId" value={room.id} />
                          <input
                            name="name"
                            required
                            minLength={2}
                            defaultValue={room.name}
                            disabled={!canManageClasses}
                            className="h-9 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                          <input
                            name="capacity"
                            type="number"
                            min={1}
                            defaultValue={room.capacity ?? ""}
                            disabled={!canManageClasses}
                            className="h-9 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                          <PendingButton
                            disabled={!canManageClasses}
                            className="h-9 rounded-md border border-[#d7e0ea] bg-white px-3 text-xs font-semibold text-[#536174] transition hover:bg-[#f1f5f9] disabled:cursor-wait disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                            pendingChildren="Saving..."
                          >
                            Save Room
                          </PendingButton>
                        </form>
                      </details>
                      <form action={deleteRoom} className="mt-3">
                        <input type="hidden" name="roomId" value={room.id} />
                        <PendingButton
                          disabled={
                            !canManageClasses || room._count.classes > 0
                          }
                          className="flex h-8 items-center gap-2 rounded-md border border-[#f4c6c6] bg-white px-3 text-xs font-semibold text-[#c73535] transition hover:bg-[#fff4f4] disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:text-[#d8a4a4]"
                          pendingChildren="Deleting..."
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          Delete Room
                        </PendingButton>
                      </form>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-[#e6edf5] pb-5">
              <div>
                <h2 className="text-lg font-semibold">Class Aktif</h2>
                <p className="mt-1 text-sm text-[#6b7890]">
                  Menampilkan {classes.length} class terbaru
                  {query ? ` untuk "${query}"` : ""}.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <details className="relative">
                  <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-md bg-[#0b6ffb] text-white transition hover:bg-[#075bc9] [&::-webkit-details-marker]:hidden">
                    <Plus className="size-5" aria-hidden="true" />
                    <span className="sr-only">Tambah class</span>
                  </summary>
                  <div className="absolute right-0 z-30 mt-2 max-h-[calc(100vh-180px)] w-[min(760px,calc(100vw-2rem))] overflow-y-auto rounded-md border border-[#dfe6ef] bg-white p-5 shadow-xl">
                    <div className="border-b border-[#e6edf5] pb-4">
                      <h3 className="text-base font-semibold">Tambah Class</h3>
                      <p className="mt-1 text-sm text-[#6b7890]">
                        Buat class, period, dan room dari satu panel.
                      </p>
                    </div>

                    <form action={createClass} className="grid gap-4 pt-5">
                      <input
                        name="name"
                        required
                        minLength={2}
                        disabled={!canCreateClass}
                        placeholder="Robotics Gold - Sabtu Pagi"
                        className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                      />
                      <div className="grid gap-3 md:grid-cols-2">
                        <select
                          name="programId"
                          required
                          disabled={!canCreateClass}
                          defaultValue=""
                          className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        >
                          <option value="" disabled>
                            Pilih program
                          </option>
                          {programs.map((program) => (
                            <option key={program.id} value={program.id}>
                              {program.name} - {program.category.name}
                            </option>
                          ))}
                        </select>
                        <select
                          name="teacherId"
                          required
                          disabled={!canCreateClass}
                          defaultValue=""
                          className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        >
                          <option value="" disabled>
                            Pilih teacher
                          </option>
                          {teachers.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.name}
                            </option>
                          ))}
                        </select>
                        <select
                          name="academicPeriodId"
                          required
                          disabled={!canCreateClass}
                          defaultValue=""
                          className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        >
                          <option value="" disabled>
                            Pilih period
                          </option>
                          {periods.map((period) => (
                            <option key={period.id} value={period.id}>
                              {period.name}
                            </option>
                          ))}
                        </select>
                        <select
                          name="roomId"
                          disabled={!canCreateClass}
                          defaultValue=""
                          className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        >
                          <option value="">Tanpa room</option>
                          {rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-3 md:grid-cols-4">
                        <select
                          name="dayOfWeek"
                          required
                          disabled={!canCreateClass}
                          defaultValue=""
                          className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        >
                          <option value="" disabled>
                            Pilih hari
                          </option>
                          {dayLabels.map((day, index) => (
                            <option key={day} value={index}>
                              {day}
                            </option>
                          ))}
                        </select>
                        <input
                          name="startsAt"
                          type="time"
                          required
                          disabled={!canCreateClass}
                          className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <input
                          name="endsAt"
                          type="time"
                          disabled={!canCreateClass}
                          className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <input
                          name="maxStudents"
                          type="number"
                          min={1}
                          required
                          disabled={!canCreateClass}
                          placeholder="Max"
                          className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                      </div>
                      <PendingButton
                        disabled={!canCreateClass}
                        className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                        pendingChildren="Menambahkan class..."
                      >
                        <Plus className="size-4" aria-hidden="true" />
                        Tambah Class
                      </PendingButton>
                    </form>

                    <div className="mt-5 grid gap-4 border-t border-[#e6edf5] pt-5 md:grid-cols-2">
                      <form action={createAcademicPeriod} className="grid gap-3">
                        <h4 className="text-sm font-semibold">Academic Period</h4>
                        <input
                          name="name"
                          required
                          minLength={2}
                          disabled={!canManageClasses}
                          placeholder="Semester 1 2026"
                          className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input
                            name="startsAt"
                            type="date"
                            disabled={!canManageClasses}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                          <input
                            name="endsAt"
                            type="date"
                            disabled={!canManageClasses}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                        </div>
                        <PendingButton
                          disabled={!canManageClasses}
                          className="h-10 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                          pendingChildren="Adding..."
                        >
                          Add Period
                        </PendingButton>
                      </form>

                      <form action={createRoom} className="grid gap-3">
                        <h4 className="text-sm font-semibold">Room</h4>
                        <input
                          name="name"
                          required
                          minLength={2}
                          disabled={!canManageClasses}
                          placeholder="Lab 1"
                          className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <input
                          name="capacity"
                          type="number"
                          min={1}
                          disabled={!canManageClasses}
                          placeholder="Capacity"
                          className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <PendingButton
                          disabled={!canManageClasses}
                          className="h-10 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                          pendingChildren="Adding..."
                        >
                          Add Room
                        </PendingButton>
                      </form>
                    </div>
                  </div>
                </details>
                <CalendarDays
                  className="size-5 text-[#0b6ffb]"
                  aria-hidden="true"
                />
              </div>
            </div>
            <ListSearch
              clearHref="/app/classes"
              placeholder="Cari class, program, teacher, atau room"
              query={query}
            />

            <div className="grid gap-3 pt-5">
              {classes.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                  Belum ada class.
                </div>
              ) : null}

              {classes.map((classItem) => {
                const locked =
                  classItem._count.enrollments > 0 ||
                  classItem._count.sessions > 0;

                return (
                  <article
                    key={classItem.id}
                    className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4 transition hover:border-[#0b6ffb] hover:bg-[#f8fbff]"
                  >
                    <Link
                      href={`/app/classes/${classItem.id}`}
                      className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold">
                            {classItem.name}
                          </h3>
                          <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                            {classItem.academicPeriod.name}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[#6b7890]">
                          {classItem.program.name} - {classItem.teacher.name}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#536174]">
                          <Clock3 className="size-3.5" aria-hidden="true" />
                          {dayLabels[classItem.dayOfWeek]},{" "}
                          {classItem.startsAt}
                          {classItem.endsAt ? ` - ${classItem.endsAt}` : ""}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-[#6b7890]">
                          <DoorOpen className="size-3.5" aria-hidden="true" />
                          {classItem.room?.name ?? "Tanpa room"} | max{" "}
                          {classItem.maxStudents} student
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <span className="rounded-md bg-[#e7f8ef] px-2 py-1 text-xs font-semibold text-[#16834a]">
                          {classItem._count.enrollments} enrollment
                        </span>
                        <span className="rounded-md bg-[#fff3d8] px-2 py-1 text-xs font-semibold text-[#a56600]">
                          {classItem._count.sessions} session
                        </span>
                      </div>
                    </Link>

                    <details className="mt-4 border-t border-[#e6edf5] pt-3">
                      <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#536174]">
                        <Pencil className="size-3.5" aria-hidden="true" />
                        Edit class
                      </summary>
                      <form action={updateClass} className="mt-3 grid gap-3">
                        <input
                          type="hidden"
                          name="classId"
                          value={classItem.id}
                        />
                        <input
                          name="name"
                          required
                          minLength={2}
                          defaultValue={classItem.name}
                          disabled={!canManageClasses}
                          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <select
                            name="programId"
                            required
                            defaultValue={classItem.programId}
                            disabled={!canManageClasses}
                            className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            {programs.map((program) => (
                              <option key={program.id} value={program.id}>
                                {program.name} - {program.category.name}
                              </option>
                            ))}
                          </select>
                          <select
                            name="teacherId"
                            required
                            defaultValue={classItem.teacherId}
                            disabled={!canManageClasses}
                            className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            {teachers.map((teacher) => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <select
                            name="academicPeriodId"
                            required
                            defaultValue={classItem.academicPeriodId}
                            disabled={!canManageClasses}
                            className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            {periods.map((period) => (
                              <option key={period.id} value={period.id}>
                                {period.name}
                              </option>
                            ))}
                          </select>
                          <select
                            name="roomId"
                            defaultValue={classItem.roomId ?? ""}
                            disabled={!canManageClasses}
                            className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            <option value="">Tanpa room</option>
                            {rooms.map((room) => (
                              <option key={room.id} value={room.id}>
                                {room.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-4">
                          <select
                            name="dayOfWeek"
                            required
                            defaultValue={classItem.dayOfWeek}
                            disabled={!canManageClasses}
                            className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            {dayLabels.map((day, index) => (
                              <option key={day} value={index}>
                                {day}
                              </option>
                            ))}
                          </select>
                          <input
                            name="startsAt"
                            type="time"
                            required
                            defaultValue={classItem.startsAt}
                            disabled={!canManageClasses}
                            className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                          <input
                            name="endsAt"
                            type="time"
                            defaultValue={classItem.endsAt ?? ""}
                            disabled={!canManageClasses}
                            className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                          <input
                            name="maxStudents"
                            type="number"
                            min={1}
                            required
                            defaultValue={classItem.maxStudents}
                            disabled={!canManageClasses}
                            className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                        </div>
                        <PendingButton
                          disabled={!canManageClasses}
                          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9] disabled:cursor-wait disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          pendingChildren="Saving..."
                        >
                          Save Class
                        </PendingButton>
                      </form>
                    </details>

                    <form action={deleteClass} className="mt-3">
                      <input
                        type="hidden"
                        name="classId"
                        value={classItem.id}
                      />
                      <PendingButton
                        disabled={!canManageClasses || locked}
                        className="flex h-9 items-center gap-2 rounded-md border border-[#f4c6c6] bg-white px-3 text-xs font-semibold text-[#c73535] transition hover:bg-[#fff4f4] disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:text-[#d8a4a4]"
                        pendingChildren="Deleting..."
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                        Delete Class
                      </PendingButton>
                    </form>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </AppPageShell>
  );
}
