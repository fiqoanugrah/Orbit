import { AttendanceStatus, EnrollmentStatus } from "@prisma/client";
import {
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  UsersRound,
} from "lucide-react";

import { AppPageShell } from "@/app/app/app-page-shell";
import {
  createAttendanceSession,
  deleteAttendanceSession,
  syncAttendanceRecords,
  updateAttendanceRecords,
  updateAttendanceSession,
} from "@/app/app/attendance/actions";
import { ListSearch } from "@/components/list-search";
import { PendingButton } from "@/components/pending-button";
import { requireWorkspaceContext } from "@/lib/organization";
import {
  activityListLimit,
  formOptionLimit,
  normalizeSearchParam,
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

const attendanceStatusLabels = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
} satisfies Record<AttendanceStatus, string>;

const attendanceStatusClasses = {
  PRESENT: "bg-[#e7f8ef] text-[#16834a]",
  ABSENT: "bg-[#ffecec] text-[#c73535]",
  LATE: "bg-[#fff3d8] text-[#a56600]",
  EXCUSED: "bg-[#eaf2ff] text-[#075bc9]",
} satisfies Record<AttendanceStatus, string>;

const statusMessages = {
  created: "Attendance session berhasil dibuat.",
  deleted: "Attendance session berhasil dihapus.",
  recordsUpdated: "Attendance records berhasil disimpan.",
  synced: "Attendance records berhasil disinkronkan.",
  updated: "Attendance session berhasil diperbarui.",
} as const;

const errorMessages = {
  class: "Class tidak ditemukan.",
  duplicate: "Attendance session untuk class dan tanggal itu sudah ada.",
  permission: "Akun kamu belum bisa mengelola attendance di organization ini.",
  session: "Attendance session tidak ditemukan.",
  "session-data": "Class dan tanggal attendance wajib dipilih.",
  status: "Status attendance tidak valid.",
} as const;

type AttendanceSearchParams = {
  created?: string;
  deleted?: string;
  error?: keyof typeof errorMessages;
  q?: string;
  recordsUpdated?: string;
  synced?: string;
  updated?: string;
};

function statusKey(params: AttendanceSearchParams) {
  return (
    ["created", "updated", "recordsUpdated", "synced", "deleted"] as const
  ).find((key) => params[key]);
}

function toDateInputValue(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<AttendanceSearchParams>;
}) {
  const params = await searchParams;
  const { organization, membership, organizations } =
    await requireWorkspaceContext("/app/attendance");
  const canManageAttendance = hasOrganizationPermission(
    membership,
    "attendance.manage",
  );
  const activeStatus = statusKey(params);
  const query = normalizeSearchParam(params.q);
  const sessionWhere = {
    organizationId: organization.id,
    ...(query
      ? {
          OR: [
            { notes: { contains: query, mode: "insensitive" as const } },
            {
              class: {
                name: { contains: query, mode: "insensitive" as const },
              },
            },
            {
              class: {
                program: {
                  name: { contains: query, mode: "insensitive" as const },
                },
              },
            },
            {
              class: {
                teacher: {
                  name: { contains: query, mode: "insensitive" as const },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [classes, sessions] = await Promise.all([
    prisma.class.findMany({
      where: { organizationId: organization.id },
      include: {
        academicPeriod: true,
        program: { include: { category: true } },
        teacher: true,
        _count: {
          select: {
            enrollments: { where: { status: EnrollmentStatus.ACTIVE } },
            sessions: true,
          },
        },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startsAt: "asc" }],
      take: formOptionLimit,
    }),
    prisma.attendanceSession.findMany({
      where: sessionWhere,
      include: {
        class: {
          include: {
            academicPeriod: true,
            program: true,
            teacher: true,
            enrollments: {
              where: { status: EnrollmentStatus.ACTIVE },
              select: { id: true },
            },
          },
        },
        records: {
          include: {
            enrollment: {
              include: {
                student: { include: { parent: true } },
              },
            },
          },
          orderBy: {
            enrollment: {
              student: {
                name: "asc",
              },
            },
          },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: activityListLimit,
    }),
  ]);
  const canCreateSession = canManageAttendance && classes.length > 0;
  const totals = sessions.flatMap((session) => session.records).reduce(
    (acc, record) => {
      acc[record.status] += 1;
      return acc;
    },
    {
      ABSENT: 0,
      EXCUSED: 0,
      LATE: 0,
      PRESENT: 0,
    } satisfies Record<AttendanceStatus, number>,
  );

  return (
    <AppPageShell
      activePath="/app/attendance"
      activeRole={membership.customRole?.name ?? membership.role}
      eyebrow="Attendance"
      organization={organization}
      organizations={organizations}
      title="Class Attendance"
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

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-md border border-[#dfe6ef] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-[#6b7890]">
              Sessions
            </p>
            <p className="mt-2 text-3xl font-semibold">{sessions.length}</p>
          </div>
          {Object.entries(attendanceStatusLabels).map(([status, label]) => (
            <div
              key={status}
              className="rounded-md border border-[#dfe6ef] bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase text-[#6b7890]">
                {label}
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {totals[status as AttendanceStatus]}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="border-b border-[#e6edf5] pb-5">
              <h2 className="text-lg font-semibold">Buat Attendance Session</h2>
              <p className="mt-1 text-sm text-[#6b7890]">
                Pilih class dan tanggal, lalu system akan menyiapkan list murid
                aktif untuk diabsen.
              </p>
            </div>

            <form action={createAttendanceSession} className="grid gap-4 pt-5">
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Class</span>
                <select
                  name="classId"
                  required
                  disabled={!canCreateSession}
                  defaultValue=""
                  className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                >
                  <option value="" disabled>
                    Pilih class
                  </option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name} - {classItem.academicPeriod.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Tanggal</span>
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={todayInputValue()}
                  disabled={!canCreateSession}
                  className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Catatan session</span>
                <textarea
                  name="notes"
                  rows={3}
                  disabled={!canCreateSession}
                  placeholder="Opsional"
                  className="rounded-md border border-[#d7e0ea] bg-white px-3 py-2 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </label>

              <PendingButton
                disabled={!canCreateSession}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                pendingChildren="Membuat attendance..."
              >
                <Plus className="size-4" aria-hidden="true" />
                Buat Session
              </PendingButton>
            </form>

            <div className="mt-6 grid gap-3 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ClipboardCheck className="size-4 text-[#0b6ffb]" />
                Status data
              </div>
              <div className="grid gap-2 text-xs text-[#6b7890] sm:grid-cols-2">
                <span>{classes.length} class tersedia</span>
                <span>
                  {classes.reduce(
                    (total, classItem) => total + classItem._count.enrollments,
                    0,
                  )}{" "}
                  active enrollment
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e6edf5] pb-5">
              <div>
                <h2 className="text-lg font-semibold">Attendance Sessions</h2>
                <p className="mt-1 text-sm text-[#6b7890]">
                  Menampilkan {sessions.length} session terbaru
                  {query ? ` untuk "${query}"` : ""}.
                </p>
              </div>
              <CalendarCheck2
                className="size-5 text-[#0b6ffb]"
                aria-hidden="true"
              />
            </div>
            <ListSearch
              clearHref="/app/attendance"
              placeholder="Cari class, program, teacher, atau catatan"
              query={query}
            />

            <div className="grid gap-3 pt-5">
              {sessions.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                  Belum ada attendance session.
                </div>
              ) : null}

              {sessions.map((session) => {
                const counts = session.records.reduce(
                  (acc, record) => {
                    acc[record.status] += 1;
                    return acc;
                  },
                  {
                    ABSENT: 0,
                    EXCUSED: 0,
                    LATE: 0,
                    PRESENT: 0,
                  } satisfies Record<AttendanceStatus, number>,
                );
                const missingRecordCount =
                  session.class.enrollments.length - session.records.length;

                return (
                  <article
                    key={session.id}
                    className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold">
                            {session.class.name}
                          </h3>
                          <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                            {formatDate(session.date)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[#6b7890]">
                          {session.class.program.name} -{" "}
                          {session.class.teacher.name}
                        </p>
                        <p className="mt-1 text-xs text-[#536174]">
                          {session.class.academicPeriod.name} |{" "}
                          {dayLabels[session.class.dayOfWeek]},{" "}
                          {session.class.startsAt}
                          {session.class.endsAt
                            ? ` - ${session.class.endsAt}`
                            : ""}
                        </p>
                        {session.notes ? (
                          <p className="mt-2 text-xs text-[#6b7890]">
                            {session.notes}
                          </p>
                        ) : null}
                      </div>
                      <div className="grid shrink-0 grid-cols-2 gap-2 text-xs font-semibold md:grid-cols-4">
                        {Object.entries(attendanceStatusLabels).map(
                          ([status, label]) => (
                            <span
                              key={status}
                              className={`rounded-md px-2 py-1 ${attendanceStatusClasses[status as AttendanceStatus]}`}
                            >
                              {label}: {counts[status as AttendanceStatus]}
                            </span>
                          ),
                        )}
                      </div>
                    </div>

                    {missingRecordCount > 0 ? (
                      <form action={syncAttendanceRecords} className="mt-4">
                        <input
                          type="hidden"
                          name="sessionId"
                          value={session.id}
                        />
                        <PendingButton
                          disabled={!canManageAttendance}
                          className="flex h-9 items-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-xs font-semibold text-[#536174] transition hover:bg-[#f1f5f9] disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          pendingChildren="Syncing..."
                        >
                          <RefreshCcw className="size-3.5" aria-hidden="true" />
                          Sync {missingRecordCount} active enrollment
                        </PendingButton>
                      </form>
                    ) : null}

                    <details className="mt-4 border-t border-[#e6edf5] pt-3">
                      <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#536174]">
                        <UsersRound className="size-3.5" aria-hidden="true" />
                        Mark attendance
                      </summary>
                      <form
                        action={updateAttendanceRecords}
                        className="mt-3 grid gap-3"
                      >
                        <input
                          type="hidden"
                          name="sessionId"
                          value={session.id}
                        />

                        {session.records.length === 0 ? (
                          <div className="rounded-md border border-dashed border-[#d7e0ea] p-4 text-center text-sm text-[#6b7890]">
                            Belum ada active enrollment di session ini.
                          </div>
                        ) : null}

                        {session.records.map((record) => (
                          <div
                            key={record.id}
                            className="grid gap-3 rounded-md border border-[#e6edf5] bg-white p-3 lg:grid-cols-[1fr_150px_1.2fr]"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {record.enrollment.student.name}
                              </p>
                              <p className="mt-1 truncate text-xs text-[#6b7890]">
                                {record.enrollment.student.parent?.name ??
                                  "Tanpa parent"}
                              </p>
                            </div>
                            <select
                              name={`status-${record.id}`}
                              required
                              defaultValue={record.status}
                              disabled={!canManageAttendance}
                              className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                            >
                              {Object.entries(attendanceStatusLabels).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                            <input
                              name={`notes-${record.id}`}
                              defaultValue={record.notes ?? ""}
                              disabled={!canManageAttendance}
                              placeholder="Catatan opsional"
                              className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                            />
                          </div>
                        ))}

                        <PendingButton
                          disabled={!canManageAttendance || session.records.length === 0}
                          className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                          pendingChildren="Saving attendance..."
                        >
                          <ClipboardCheck
                            className="size-4"
                            aria-hidden="true"
                          />
                          Save Attendance
                        </PendingButton>
                      </form>
                    </details>

                    <details className="mt-4 border-t border-[#e6edf5] pt-3">
                      <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#536174]">
                        <Pencil className="size-3.5" aria-hidden="true" />
                        Edit session
                      </summary>
                      <form
                        action={updateAttendanceSession}
                        className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr_auto]"
                      >
                        <input
                          type="hidden"
                          name="sessionId"
                          value={session.id}
                        />
                        <input
                          name="date"
                          type="date"
                          required
                          defaultValue={toDateInputValue(session.date)}
                          disabled={!canManageAttendance}
                          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <input
                          name="notes"
                          defaultValue={session.notes ?? ""}
                          disabled={!canManageAttendance}
                          placeholder="Catatan session"
                          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <PendingButton
                          disabled={!canManageAttendance}
                          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9] disabled:cursor-wait disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          pendingChildren="Saving..."
                        >
                          Save Session
                        </PendingButton>
                      </form>
                    </details>

                    <form action={deleteAttendanceSession} className="mt-3">
                      <input
                        type="hidden"
                        name="sessionId"
                        value={session.id}
                      />
                      <PendingButton
                        disabled={!canManageAttendance}
                        className="flex h-9 items-center gap-2 rounded-md border border-[#f4c6c6] bg-white px-3 text-xs font-semibold text-[#c73535] transition hover:bg-[#fff4f4] disabled:cursor-wait disabled:bg-[#f6f8fb] disabled:text-[#d8a4a4]"
                        pendingChildren="Deleting..."
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                        Delete Session
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
