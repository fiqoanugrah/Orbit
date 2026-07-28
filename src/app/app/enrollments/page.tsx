import { EnrollmentStatus } from "@prisma/client";
import {
  CheckCircle2,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
  UserRoundCheck,
} from "lucide-react";

import { AppPageShell } from "@/app/app/app-page-shell";
import {
  createEnrollment,
  deleteEnrollment,
  updateEnrollment,
} from "@/app/app/enrollments/actions";
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

const enrollmentStatusLabels = {
  ACTIVE: "Active",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  PAUSED: "Paused",
} satisfies Record<EnrollmentStatus, string>;

const enrollmentStatusClasses = {
  ACTIVE: "bg-[#e7f8ef] text-[#16834a]",
  CANCELLED: "bg-[#ffecec] text-[#c73535]",
  COMPLETED: "bg-[#eaf2ff] text-[#075bc9]",
  PAUSED: "bg-[#fff3d8] text-[#a56600]",
} satisfies Record<EnrollmentStatus, string>;

const statusMessages = {
  created: "Enrollment berhasil ditambahkan.",
  deleted: "Enrollment berhasil dihapus.",
  updated: "Enrollment berhasil diperbarui.",
} as const;

const errorMessages = {
  class: "Class tidak ditemukan.",
  duplicate: "Student sudah terdaftar di class dan period yang sama.",
  enrollment: "Enrollment tidak ditemukan.",
  "enrollment-data": "Student, class, dan status wajib dipilih.",
  "enrollment-dates": "Tanggal selesai harus setelah tanggal masuk.",
  "enrollment-has-records": "Enrollment sudah punya invoice atau attendance.",
  permission: "Akun kamu belum bisa mengelola enrollment di organization ini.",
  student: "Student tidak ditemukan.",
} as const;

type EnrollmentsSearchParams = {
  created?: string;
  deleted?: string;
  error?: keyof typeof errorMessages;
  q?: string;
  updated?: string;
};

function statusKey(params: EnrollmentsSearchParams) {
  return (["created", "updated", "deleted"] as const).find((key) => params[key]);
}

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
    : "-";
}

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<EnrollmentsSearchParams>;
}) {
  const params = await searchParams;
  const { organization, membership, organizations } =
    await requireWorkspaceContext("/app/enrollments");
  const canManageEnrollments = hasOrganizationPermission(
    membership,
    "students.manage",
  );
  const activeStatus = statusKey(params);
  const query = normalizeSearchParam(params.q);
  const enrollmentWhere = {
    organizationId: organization.id,
    ...(query
      ? {
          OR: [
            {
              student: {
                name: { contains: query, mode: "insensitive" as const },
              },
            },
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
              academicPeriod: {
                name: { contains: query, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };

  const [students, classes, enrollments] = await Promise.all([
    prisma.student.findMany({
      where: { organizationId: organization.id },
      include: { parent: true },
      orderBy: { name: "asc" },
      take: formOptionLimit,
    }),
    prisma.class.findMany({
      where: { organizationId: organization.id },
      include: {
        academicPeriod: true,
        program: { include: { category: true } },
        teacher: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startsAt: "asc" }],
      take: formOptionLimit,
    }),
    prisma.enrollment.findMany({
      where: enrollmentWhere,
      include: {
        academicPeriod: true,
        class: {
          include: {
            program: { include: { category: true } },
            teacher: true,
          },
        },
        student: { include: { parent: true } },
        _count: { select: { attendance: true, invoices: true } },
      },
      orderBy: { createdAt: "desc" },
      take: pageListLimit,
    }),
  ]);
  const canCreateEnrollment =
    canManageEnrollments && students.length > 0 && classes.length > 0;

  return (
    <AppPageShell
      activePath="/app/enrollments"
      activeRole={membership.customRole?.name ?? membership.role}
      eyebrow="Enrollments"
      organization={organization}
      organizations={organizations}
      title="Student Enrollment"
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

        <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="border-b border-[#e6edf5] pb-5">
              <h2 className="text-lg font-semibold">Tambah Enrollment</h2>
              <p className="mt-1 text-sm text-[#6b7890]">
                Student akan masuk ke class sesuai academic period class itu.
              </p>
            </div>

            <form action={createEnrollment} className="grid gap-4 pt-5">
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Student</span>
                <select
                  name="studentId"
                  required
                  disabled={!canCreateEnrollment}
                  defaultValue=""
                  className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                >
                  <option value="" disabled>
                    Pilih student
                  </option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                      {student.parent ? ` - ${student.parent.name}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Class</span>
                <select
                  name="classId"
                  required
                  disabled={!canCreateEnrollment}
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

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Status</span>
                  <select
                    name="status"
                    required
                    disabled={!canCreateEnrollment}
                    defaultValue="ACTIVE"
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  >
                    {Object.entries(enrollmentStatusLabels).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Tanggal masuk</span>
                  <input
                    name="joinedAt"
                    type="date"
                    disabled={!canCreateEnrollment}
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Tanggal selesai</span>
                  <input
                    name="endedAt"
                    type="date"
                    disabled={!canCreateEnrollment}
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>
              </div>

              <PendingButton
                disabled={!canCreateEnrollment}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                pendingChildren="Menambahkan enrollment..."
              >
                <Plus className="size-4" aria-hidden="true" />
                Tambah Enrollment
              </PendingButton>
            </form>

            <div className="mt-6 grid gap-3 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ClipboardList className="size-4 text-[#0b6ffb]" />
                Prasyarat data
              </div>
              <div className="grid gap-2 text-xs text-[#6b7890] sm:grid-cols-2">
                <span>{students.length} student tersedia</span>
                <span>{classes.length} class tersedia</span>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e6edf5] pb-5">
              <div>
                <h2 className="text-lg font-semibold">Enrollment Aktif</h2>
                <p className="mt-1 text-sm text-[#6b7890]">
                  Menampilkan {enrollments.length} enrollment terbaru
                  {query ? ` untuk "${query}"` : ""}.
                </p>
              </div>
              <UserRoundCheck
                className="size-5 text-[#0b6ffb]"
                aria-hidden="true"
              />
            </div>
            <ListSearch
              clearHref="/app/enrollments"
              placeholder="Cari student, class, program, atau period"
              query={query}
            />

            <div className="grid gap-3 pt-5">
              {enrollments.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                  Belum ada enrollment.
                </div>
              ) : null}

              {enrollments.map((enrollment) => {
                const locked =
                  enrollment._count.attendance > 0 ||
                  enrollment._count.invoices > 0;

                return (
                  <article
                    key={enrollment.id}
                    className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold">
                            {enrollment.student.name}
                          </h3>
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-semibold ${enrollmentStatusClasses[enrollment.status]}`}
                          >
                            {enrollmentStatusLabels[enrollment.status]}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[#6b7890]">
                          {enrollment.class.name} -{" "}
                          {enrollment.class.program.name}
                        </p>
                        <p className="mt-1 text-xs text-[#536174]">
                          {enrollment.academicPeriod.name} |{" "}
                          {dayLabels[enrollment.class.dayOfWeek]},{" "}
                          {enrollment.class.startsAt}
                          {enrollment.class.endsAt
                            ? ` - ${enrollment.class.endsAt}`
                            : ""}
                        </p>
                        <p className="mt-1 text-xs text-[#6b7890]">
                          Masuk {formatDate(enrollment.joinedAt)} | Selesai{" "}
                          {formatDate(enrollment.endedAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                          {enrollment._count.attendance} attendance
                        </span>
                        <span className="rounded-md bg-[#fff3d8] px-2 py-1 text-xs font-semibold text-[#a56600]">
                          {enrollment._count.invoices} invoice
                        </span>
                      </div>
                    </div>

                    <details className="mt-4 border-t border-[#e6edf5] pt-3">
                      <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#536174]">
                        <Pencil className="size-3.5" aria-hidden="true" />
                        Edit enrollment
                      </summary>
                      <form
                        action={updateEnrollment}
                        className="mt-3 grid gap-3"
                      >
                        <input
                          type="hidden"
                          name="enrollmentId"
                          value={enrollment.id}
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <select
                            name="studentId"
                            required
                            defaultValue={enrollment.studentId}
                            disabled={!canManageEnrollments}
                            className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            {students.map((student) => (
                              <option key={student.id} value={student.id}>
                                {student.name}
                                {student.parent ? ` - ${student.parent.name}` : ""}
                              </option>
                            ))}
                          </select>
                          <select
                            name="classId"
                            required
                            defaultValue={enrollment.classId}
                            disabled={!canManageEnrollments}
                            className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            {classes.map((classItem) => (
                              <option key={classItem.id} value={classItem.id}>
                                {classItem.name} -{" "}
                                {classItem.academicPeriod.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <select
                            name="status"
                            required
                            defaultValue={enrollment.status}
                            disabled={!canManageEnrollments}
                            className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            {Object.entries(enrollmentStatusLabels).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                          <input
                            name="joinedAt"
                            type="date"
                            defaultValue={toDateInputValue(enrollment.joinedAt)}
                            disabled={!canManageEnrollments}
                            className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                          <input
                            name="endedAt"
                            type="date"
                            defaultValue={toDateInputValue(enrollment.endedAt)}
                            disabled={!canManageEnrollments}
                            className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                        </div>

                        <PendingButton
                          disabled={!canManageEnrollments}
                          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9] disabled:cursor-wait disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          pendingChildren="Saving..."
                        >
                          Save Enrollment
                        </PendingButton>
                      </form>
                    </details>

                    <form action={deleteEnrollment} className="mt-3">
                      <input
                        type="hidden"
                        name="enrollmentId"
                        value={enrollment.id}
                      />
                      <PendingButton
                        disabled={!canManageEnrollments || locked}
                        className="flex h-9 items-center gap-2 rounded-md border border-[#f4c6c6] bg-white px-3 text-xs font-semibold text-[#c73535] transition hover:bg-[#fff4f4] disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:text-[#d8a4a4]"
                        pendingChildren="Deleting..."
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                        Delete Enrollment
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
