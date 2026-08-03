import {
  BillingAgreementStatus,
  BillingRule,
  EnrollmentStatus,
} from "@prisma/client";
import {
  CircleDollarSign,
  CheckCircle2,
  ClipboardList,
  Pencil,
  Plus,
  StopCircle,
  Trash2,
  UserRoundCheck,
} from "lucide-react";

import { AppPageShell } from "@/app/app/app-page-shell";
import {
  createEnrollment,
  createBillingAgreement,
  deleteBillingAgreement,
  deleteEnrollment,
  endBillingAgreement,
  updateBillingAgreement,
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

const billingRuleLabels = {
  MONTHLY: "Bulanan",
  PRIVATE: "Private",
  SEMESTER: "Semester penuh",
  TRIAL: "Trial",
} satisfies Record<BillingRule, string>;

const billingAgreementStatusLabels = {
  ACTIVE: "Active",
  CANCELLED: "Cancelled",
  ENDED: "Ended",
} satisfies Record<BillingAgreementStatus, string>;

const billingAgreementStatusClasses = {
  ACTIVE: "bg-[#e7f8ef] text-[#16834a]",
  CANCELLED: "bg-[#ffecec] text-[#c73535]",
  ENDED: "bg-[#f1f5f9] text-[#6b7890]",
} satisfies Record<BillingAgreementStatus, string>;

const statusMessages = {
  billingCreated: "Billing agreement berhasil dibuat.",
  billingDeleted: "Billing agreement berhasil dihapus.",
  billingUpdated: "Billing agreement berhasil diperbarui.",
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
  "billing-agreement": "Billing agreement tidak ditemukan.",
  "billing-data":
    "Enrollment, paket harga, billing rule, status, tanggal, dan nominal wajib valid.",
  "billing-dates": "Tanggal selesai agreement harus setelah tanggal mulai.",
  "billing-has-invoices":
    "Billing agreement sudah dipakai invoice, jadi tidak bisa dihapus.",
  "billing-plan": "Paket harga untuk agreement tidak ditemukan.",
  "billing-program": "Paket agreement harus sesuai program class enrollment.",
  permission: "Akun kamu belum bisa mengelola enrollment di organization ini.",
  student: "Student tidak ditemukan.",
} as const;

type EnrollmentsSearchParams = {
  created?: string;
  deleted?: string;
  error?: keyof typeof errorMessages;
  billingCreated?: string;
  billingDeleted?: string;
  billingUpdated?: string;
  q?: string;
  updated?: string;
};

function statusKey(params: EnrollmentsSearchParams) {
  return (
    [
      "created",
      "updated",
      "deleted",
      "billingCreated",
      "billingUpdated",
      "billingDeleted",
    ] as const
  ).find((key) => params[key]);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
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
  const canManageBilling = hasOrganizationPermission(
    membership,
    "billing.manage",
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

  const [students, classes, pricingPlans, enrollments, billingAgreements] =
    await Promise.all([
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
    prisma.pricingPlan.findMany({
      where: { organizationId: organization.id, isActive: true },
      include: { program: true },
      orderBy: { name: "asc" },
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
    prisma.billingAgreement.findMany({
      where: { organizationId: organization.id },
      include: {
        academicPeriod: true,
        enrollment: {
          include: {
            class: { include: { program: true } },
          },
        },
        pricingPlan: { include: { program: true } },
        student: true,
        _count: { select: { invoices: true } },
      },
      orderBy: [{ status: "asc" }, { startsAt: "desc" }],
      take: pageListLimit,
    }),
  ]);
  const canCreateEnrollment =
    canManageEnrollments && students.length > 0 && classes.length > 0;
  const canCreateBillingAgreement =
    canManageBilling && enrollments.length > 0 && pricingPlans.length > 0;

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

        <div className="grid gap-6">
          <section className="hidden rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
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

        <section className="mt-6 rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#e6edf5] pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Billing Agreement</h2>
              <p className="mt-1 text-sm text-[#6b7890]">
                Catat cara bayar student per enrollment: bulanan, semester
                penuh, trial, atau private. Invoice bisa dibuat dari agreement
                ini tanpa mengubah history tagihan lama.
              </p>
            </div>
            <CircleDollarSign
              className="size-5 text-[#0b6ffb]"
              aria-hidden="true"
            />
          </div>

          <div className="grid gap-6 pt-5 xl:grid-cols-[0.82fr_1.18fr]">
            <form
              action={createBillingAgreement}
              className="grid min-w-0 gap-4 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4"
            >
              <div>
                <h3 className="text-sm font-semibold">Agreement Baru</h3>
                <p className="mt-1 text-xs text-[#6b7890]">
                  Agreement active lama di enrollment yang sama otomatis ditutup
                  saat agreement baru dibuat.
                </p>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Enrollment</span>
                <select
                  name="agreementEnrollmentId"
                  required
                  defaultValue=""
                  disabled={!canCreateBillingAgreement}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                >
                  <option value="" disabled>
                    Pilih enrollment
                  </option>
                  {enrollments.map((enrollment) => (
                    <option key={enrollment.id} value={enrollment.id}>
                      {enrollment.student.name} - {enrollment.class.name} -{" "}
                      {enrollment.academicPeriod.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Paket harga</span>
                <select
                  name="agreementPricingPlanId"
                  required
                  defaultValue=""
                  disabled={!canCreateBillingAgreement}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                >
                  <option value="" disabled>
                    Pilih paket
                  </option>
                  {pricingPlans.map((pricingPlan) => (
                    <option key={pricingPlan.id} value={pricingPlan.id}>
                      {pricingPlan.program.name} - {pricingPlan.name} -{" "}
                      {formatCurrency(pricingPlan.price)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Billing rule</span>
                  <select
                    name="billingRule"
                    required
                    defaultValue="MONTHLY"
                    disabled={!canCreateBillingAgreement}
                    className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  >
                    {Object.entries(billingRuleLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Status</span>
                  <select
                    name="agreementStatus"
                    required
                    defaultValue="ACTIVE"
                    disabled={!canCreateBillingAgreement}
                    className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  >
                    {Object.entries(billingAgreementStatusLabels).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>

              <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Mulai</span>
                  <input
                    name="startsAt"
                    type="date"
                    disabled={!canCreateBillingAgreement}
                    className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Selesai</span>
                  <input
                    name="endsAt"
                    type="date"
                    disabled={!canCreateBillingAgreement}
                    className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Nominal</span>
                  <input
                    name="amount"
                    type="number"
                    min={1}
                    required
                    disabled={!canCreateBillingAgreement}
                    className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Catatan</span>
                <input
                  name="notes"
                  disabled={!canCreateBillingAgreement}
                  placeholder="Contoh: mulai bulan Oktober pindah ke bayar semester"
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </label>

              <PendingButton
                disabled={!canCreateBillingAgreement}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                pendingChildren="Menyimpan agreement..."
              >
                <Plus className="size-4" aria-hidden="true" />
                Buat Agreement
              </PendingButton>
            </form>

            <div className="grid min-w-0 gap-3">
              {billingAgreements.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#d7e0ea] bg-[#fbfcfe] p-5 text-center text-sm text-[#6b7890]">
                  Belum ada billing agreement.
                </div>
              ) : null}

              {billingAgreements.map((agreement) => {
                const isLocked = agreement._count.invoices > 0;

                return (
                  <article
                    key={agreement.id}
                    className="min-w-0 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold">
                            {agreement.student.name}
                          </h3>
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-semibold ${billingAgreementStatusClasses[agreement.status]}`}
                          >
                            {billingAgreementStatusLabels[agreement.status]}
                          </span>
                          <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                            {billingRuleLabels[agreement.billingRule]}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[#6b7890]">
                          {agreement.enrollment?.class.name ?? "Tanpa class"} -{" "}
                          {agreement.pricingPlan?.name ?? "Tanpa paket"}
                        </p>
                        <p className="mt-1 text-xs text-[#536174]">
                          {formatDate(agreement.startsAt)} -{" "}
                          {formatDate(agreement.endsAt)} |{" "}
                          {formatCurrency(agreement.amount)}
                        </p>
                        {agreement.notes ? (
                          <p className="mt-1 text-xs text-[#6b7890]">
                            {agreement.notes}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-md bg-[#fff3d8] px-2 py-1 text-xs font-semibold text-[#a56600]">
                        {agreement._count.invoices} invoice
                      </span>
                    </div>

                    <details className="mt-4 border-t border-[#e6edf5] pt-3">
                      <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#536174]">
                        <Pencil className="size-3.5" aria-hidden="true" />
                        Edit agreement
                      </summary>
                      <form
                        action={updateBillingAgreement}
                        className="mt-3 grid min-w-0 gap-3"
                      >
                        <input
                          type="hidden"
                          name="agreementId"
                          value={agreement.id}
                        />
                        <div className="grid min-w-0 gap-3 md:grid-cols-2">
                          <select
                            name="agreementEnrollmentId"
                            required
                            defaultValue={agreement.enrollmentId ?? ""}
                            disabled={!canManageBilling}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            {enrollments.map((enrollment) => (
                              <option key={enrollment.id} value={enrollment.id}>
                                {enrollment.student.name} -{" "}
                                {enrollment.class.name}
                              </option>
                            ))}
                          </select>
                          <select
                            name="agreementPricingPlanId"
                            required
                            defaultValue={agreement.pricingPlanId ?? ""}
                            disabled={!canManageBilling}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            {pricingPlans.map((pricingPlan) => (
                              <option key={pricingPlan.id} value={pricingPlan.id}>
                                {pricingPlan.program.name} - {pricingPlan.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <select
                            name="billingRule"
                            required
                            defaultValue={agreement.billingRule}
                            disabled={!canManageBilling}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            {Object.entries(billingRuleLabels).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                          <select
                            name="agreementStatus"
                            required
                            defaultValue={agreement.status}
                            disabled={!canManageBilling}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            {Object.entries(billingAgreementStatusLabels).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                          <input
                            name="startsAt"
                            type="date"
                            defaultValue={toDateInputValue(agreement.startsAt)}
                            disabled={!canManageBilling}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                          <input
                            name="endsAt"
                            type="date"
                            defaultValue={toDateInputValue(agreement.endsAt)}
                            disabled={!canManageBilling}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                        </div>
                        <div className="grid min-w-0 gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                          <input
                            name="amount"
                            type="number"
                            min={1}
                            required
                            defaultValue={agreement.amount}
                            disabled={!canManageBilling}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                          <input
                            name="notes"
                            defaultValue={agreement.notes ?? ""}
                            disabled={!canManageBilling}
                            placeholder="Catatan agreement"
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                        </div>
                        <PendingButton
                          disabled={!canManageBilling}
                          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9] disabled:cursor-wait disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          pendingChildren="Saving..."
                        >
                          Save Agreement
                        </PendingButton>
                      </form>
                    </details>

                    <div className="mt-3 grid gap-2 border-t border-[#e6edf5] pt-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <form
                        action={endBillingAgreement}
                        className="grid min-w-0 gap-2 sm:grid-cols-[160px_auto]"
                      >
                        <input
                          type="hidden"
                          name="agreementId"
                          value={agreement.id}
                        />
                        <input
                          name="endedAt"
                          type="date"
                          disabled={!canManageBilling}
                          className="h-9 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-xs outline-none focus:border-[#0b6ffb] disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <PendingButton
                          disabled={!canManageBilling}
                          className="flex h-9 items-center justify-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-xs font-semibold text-[#536174] transition hover:bg-[#f1f5f9] disabled:cursor-wait disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          pendingChildren="Ending..."
                        >
                          <StopCircle className="size-3.5" aria-hidden="true" />
                          End
                        </PendingButton>
                      </form>

                      <form action={deleteBillingAgreement}>
                        <input
                          type="hidden"
                          name="agreementId"
                          value={agreement.id}
                        />
                        <PendingButton
                          disabled={!canManageBilling || isLocked}
                          className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[#f4c6c6] bg-white px-3 text-xs font-semibold text-[#c73535] transition hover:bg-[#fff4f4] disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:text-[#d8a4a4]"
                          pendingChildren="Deleting..."
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          Delete
                        </PendingButton>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </AppPageShell>
  );
}
