import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  Layers,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  UserCircle,
} from "lucide-react";

import { AppPageShell } from "@/app/app/app-page-shell";
import {
  createBillingAgreement,
  createEnrollment,
} from "@/app/app/enrollments/actions";
import { createInvoice } from "@/app/app/invoices/actions";
import {
  StudentDeleteForm,
  StudentEditForm,
} from "@/app/app/students/student-forms";
import { updateStudentLevel } from "@/app/app/students/actions";
import { DetailCard, DetailField } from "@/components/detail-card";
import { PendingButton } from "@/components/pending-button";
import { requireWorkspaceContext } from "@/lib/organization";
import { formOptionLimit, pageListLimit } from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";
import { cn } from "@/lib/utils";
import {
  BillingAgreementStatus,
  BillingRule,
  EnrollmentStatus,
  AttendanceStatus,
  InvoiceStatus,
} from "@prisma/client";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(value)
    : "-";
}

function formatDateInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function studentCode(createdAt: Date, id: string) {
  const year = String(createdAt.getFullYear()).slice(-2);
  const digits = id.replace(/\D/g, "").slice(-4).padStart(4, "0");
  return `S${year}-${digits}`;
}

function paidAmount(invoice: {
  payments: Array<{ amount: number; status: string }>;
}) {
  return invoice.payments
    .filter((payment) => payment.status === "CONFIRMED")
    .reduce((total, payment) => total + payment.amount, 0);
}

const enrollmentStatusLabels = {
  ACTIVE: "Active",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  PAUSED: "Paused",
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

const invoiceStatusLabels = {
  DRAFT: "Draft",
  OVERDUE: "Overdue",
  PAID: "Paid",
  PARTIAL: "Partial",
  UNPAID: "Unpaid",
  VOID: "Void",
} satisfies Record<InvoiceStatus, string>;

const registrationFeeDescription = "Registration Fee";

const studentDetailTabs = [
  "profile",
  "enrollment",
  "billing",
  "attendance",
] as const;

type StudentDetailTab = (typeof studentDetailTabs)[number];

function getStudentDetailTab(value: string | undefined): StudentDetailTab {
  return studentDetailTabs.includes(value as StudentDetailTab)
    ? (value as StudentDetailTab)
    : "profile";
}

const attendanceStatusLabels = {
  ABSENT: "Absent",
  EXCUSED: "Excused",
  LATE: "Late",
  PRESENT: "Present",
} satisfies Record<AttendanceStatus, string>;

const attendanceStatusClasses = {
  ABSENT: "bg-[#ffecec] text-[#c73535]",
  EXCUSED: "bg-[#fff3d8] text-[#a56600]",
  LATE: "bg-[#fff3d8] text-[#a56600]",
  PRESENT: "bg-[#e7f8ef] text-[#16834a]",
} satisfies Record<AttendanceStatus, string>;

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { studentId } = await params;
  const resolvedSearchParams = await searchParams;
  const activeTab = getStudentDetailTab(resolvedSearchParams?.tab);
  const { organization, membership, organizations } =
    await requireWorkspaceContext(`/app/students/${studentId}`);
  const canManageStudents = hasOrganizationPermission(
    membership,
    "students.manage",
  );
  const canManageBilling = hasOrganizationPermission(
    membership,
    "billing.manage",
  );
  const currentPath = `/app/students/${studentId}`;

  const [student, students, parents, classes, pricingPlans, levels] =
    await Promise.all([
    prisma.student.findFirst({
      where: { id: studentId, organizationId: organization.id },
      include: {
        currentLevel: true,
        enrollments: {
          include: {
            academicPeriod: true,
            attendance: {
              include: { session: true },
              orderBy: { createdAt: "desc" },
              take: 6,
            },
            class: {
              include: {
                program: { include: { academicLevel: true } },
                room: true,
                teacher: true,
              },
            },
            billingAgreements: {
              include: {
                pricingPlan: { include: { program: true } },
                _count: { select: { invoices: true } },
              },
              orderBy: [{ status: "asc" }, { startsAt: "desc" }],
            },
          },
          orderBy: { createdAt: "desc" },
        },
        billingAgreements: {
          include: {
            academicPeriod: true,
            enrollment: {
              include: {
                class: { include: { program: true } },
              },
            },
            pricingPlan: { include: { program: true } },
            _count: { select: { invoices: true } },
          },
          orderBy: [{ status: "asc" }, { startsAt: "desc" }],
        },
        invoices: {
          include: {
            billingAgreement: true,
            enrollment: {
              include: {
                class: { include: { program: true } },
              },
            },
            lines: true,
            payments: true,
            pricingPlan: { include: { program: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 8,
        },
        levelHistory: {
          include: {
            fromLevel: true,
            toLevel: true,
          },
          orderBy: { effectiveAt: "desc" },
          take: 6,
        },
        parent: true,
      },
    }),
    prisma.student.findMany({
      where: { organizationId: organization.id },
      include: {
        parent: true,
        _count: { select: { enrollments: true, invoices: true } },
      },
      orderBy: { name: "asc" },
      take: pageListLimit,
    }),
    prisma.parent.findMany({
      where: { organizationId: organization.id },
      orderBy: { name: "asc" },
      take: formOptionLimit,
    }),
    prisma.class.findMany({
      where: { organizationId: organization.id },
      include: {
        academicPeriod: true,
        program: { include: { academicLevel: true } },
        room: true,
        teacher: true,
      },
      orderBy: [{ dayOfWeek: "asc" }, { startsAt: "asc" }],
      take: formOptionLimit,
    }),
    prisma.pricingPlan.findMany({
      where: { organizationId: organization.id, isActive: true },
      include: { program: { include: { academicLevel: true } } },
      orderBy: { name: "asc" },
      take: formOptionLimit,
    }),
    prisma.academicLevel.findMany({
      where: { organizationId: organization.id, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: formOptionLimit,
    }),
  ]);

  if (!student) {
    notFound();
  }

  const activeEnrollments = student.enrollments.filter(
    (enrollment) => enrollment.status === "ACTIVE",
  );
  const attendanceRecords = student.enrollments
    .flatMap((enrollment) =>
      enrollment.attendance.map((record) => ({
        ...record,
        className: enrollment.class.name,
      })),
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6);
  const totalOutstanding = student.invoices.reduce((total, invoice) => {
    if (invoice.status === "VOID" || invoice.status === "PAID") {
      return total;
    }

    return total + Math.max(invoice.total - paidAmount(invoice), 0);
  }, 0);
  const hasRegistrationFee = student.invoices.some(
    (invoice) =>
      invoice.status !== InvoiceStatus.VOID &&
      invoice.lines.some((line) => line.description === registrationFeeDescription),
  );
  const code = studentCode(student.createdAt, student.id);
  const primaryEnrollment = activeEnrollments[0] ?? student.enrollments[0];
  const canCreateEnrollment = canManageStudents && classes.length > 0;
  const canCreateBillingAgreement =
    canManageBilling &&
    student.enrollments.length > 0 &&
    pricingPlans.length > 0;
  const canCreateInvoice =
    canManageBilling &&
    ((student.enrollments.length > 0 && pricingPlans.length > 0) ||
      student.billingAgreements.length > 0);
  const detailNav = [
    {
      badge: null,
      href: `${currentPath}?tab=profile`,
      icon: UserCircle,
      key: "profile",
      label: "Profile",
    },
    {
      badge: String(student.enrollments.length),
      href: `${currentPath}?tab=enrollment`,
      icon: BookOpen,
      key: "enrollment",
      label: "Enrollment",
    },
    {
      badge: formatCurrency(totalOutstanding),
      href: `${currentPath}?tab=billing`,
      icon: CreditCard,
      key: "billing",
      label: "Billing",
    },
    {
      badge: String(attendanceRecords.length),
      href: `${currentPath}?tab=attendance`,
      icon: CalendarDays,
      key: "attendance",
      label: "Attendance",
    },
  ] satisfies Array<{
    badge: string | null;
    href: string;
    icon: typeof UserCircle;
    key: StudentDetailTab;
    label: string;
  }>;

  return (
    <AppPageShell
      activePath="/app/students"
      activeRole={membership.customRole?.name ?? membership.role}
      eyebrow="Student Detail"
      organization={organization}
      organizations={organizations}
      title={student.name}
    >
      <div className="mx-auto grid max-w-[1600px] gap-6 xl:grid-cols-[300px_320px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-md border border-[#dfe6ef] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#e6edf5] pb-4">
            <div>
              <h2 className="text-lg font-semibold">Students</h2>
              <p className="mt-1 text-xs text-[#6b7890]">
                {students.length} data student
              </p>
            </div>
            <Link
              href="/app/students"
              className="rounded-md border border-[#d7e0ea] px-3 py-2 text-xs font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
            >
              New
            </Link>
          </div>

          <div className="mt-4 grid max-h-[760px] gap-2 overflow-y-auto pr-1">
            {students.map((item) => (
              <Link
                key={item.id}
                href={`/app/students/${item.id}?tab=${activeTab}`}
                className={cn(
                  "flex min-w-0 gap-3 rounded-md border p-3 transition",
                  item.id === student.id
                    ? "border-[#cfe0ff] bg-[#eaf8fc]"
                    : "border-[#e6edf5] bg-[#fbfcfe] hover:border-[#0b6ffb] hover:bg-[#eef5ff]",
                )}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#eaf2ff] text-[#075bc9] ring-1 ring-[#cfe0ff]">
                  {item.photoUrl ? (
                    <img
                      src={item.photoUrl}
                      alt=""
                      className="size-full rounded-full object-cover"
                    />
                  ) : (
                    <UserCircle className="size-6" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold">
                      {item.name}
                    </span>
                    {item._count.enrollments > 0 ? (
                      <span className="size-2 shrink-0 rounded-full bg-[#26c76f]" />
                    ) : null}
                  </span>
                  <span className="mt-1 block truncate text-xs text-[#6b7890]">
                    {studentCode(item.createdAt, item.id)}
                    {item.parent ? ` - ${item.parent.name}` : ""}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded-md bg-[#dff2ff] px-2 py-0.5 text-[11px] font-semibold text-[#075bc9]">
                      {item._count.enrollments}
                    </span>
                    <span className="rounded-md bg-[#fff3d8] px-2 py-0.5 text-[11px] font-semibold text-[#a56600]">
                      {item._count.invoices} inv
                    </span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </aside>

        <aside className="min-w-0 rounded-md border border-[#dfe6ef] bg-white shadow-sm">
          <div className="h-24 rounded-t-md bg-[#e6eef7]" />
          <div className="-mt-12 px-5 pb-5 text-center">
            <div className="mx-auto grid size-28 place-items-center overflow-hidden rounded-md border border-[#d7e0ea] bg-white text-[#0b6ffb] shadow-sm">
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <UserCircle className="size-16" aria-hidden="true" />
              )}
            </div>
            <h2 className="mt-4 text-xl font-semibold">{student.name}</h2>
            <p className="mt-1 text-sm font-semibold text-[#9aa7b8]">{code}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="rounded-md bg-[#f1f5f9] px-3 py-1 text-sm font-semibold text-[#536174]">
                {student.currentLevel?.name ??
                  primaryEnrollment?.class.program.academicLevel?.name ??
                  "No level"}
              </span>
              {primaryEnrollment ? (
                <span className="rounded-md bg-[#dff2ff] px-3 py-1 text-sm font-semibold text-[#075bc9]">
                  {primaryEnrollment.class.name}
                </span>
              ) : null}
              <span className="rounded-md bg-[#e7f8ef] px-3 py-1 text-sm font-semibold text-[#16834a]">
                {activeEnrollments.length > 0 ? "Active" : "No enrollment"}
              </span>
            </div>
          </div>

          <nav className="border-t border-[#e6edf5] p-4">
            {detailNav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md px-3 py-3 text-sm font-semibold transition",
                  activeTab === item.key
                    ? "bg-[#eef5ff] text-[#075bc9]"
                    : "text-[#172033] hover:bg-[#f6f8fb] hover:text-[#075bc9]",
                )}
              >
                <span className="flex items-center gap-3">
                  <item.icon
                    className={cn(
                      "size-5",
                      activeTab === item.key ? "text-[#0b6ffb]" : "text-[#536174]",
                    )}
                    aria-hidden="true"
                  />
                  {item.label}
                </span>
                {item.badge ? (
                  <span className="max-w-32 truncate rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="grid min-w-0 gap-6">
          <Link
            href="/app/students"
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Students
          </Link>

          {activeTab === "profile" ? (
            <DetailCard icon={Pencil} title="Edit Profile">
              <StudentEditForm
                canManageStudents={canManageStudents}
                parents={parents.map((parent) => ({
                  id: parent.id,
                  name: parent.name,
                }))}
                student={{
                  birthDate: formatDateInput(student.birthDate),
                  id: student.id,
                  name: student.name,
                  notes: student.notes ?? "",
                  parentId: student.parentId ?? "",
                  phone: student.phone ?? "",
                  photoUrl: student.photoUrl ?? "",
                }}
              />
            </DetailCard>
          ) : null}

          {activeTab === "profile" ? (
            <DetailCard icon={UserCircle} title="Personal Details">
              <div className="grid gap-6 md:grid-cols-3">
                <DetailField label="Student Code" value={code} />
                <DetailField label="Student Name" value={student.name} />
                <DetailField
                  label="Date Of Birth"
                  value={formatDate(student.birthDate)}
                />
                <DetailField label="Parent" value={student.parent?.name ?? "-"} />
                <DetailField label="Phone" value={student.phone ?? "-"} />
                <DetailField label="Notes" value={student.notes ?? "-"} />
              </div>
            </DetailCard>
          ) : null}

          {activeTab === "enrollment" ? (
            <DetailCard icon={BookOpen} title="Academy Details">
            <div className="grid gap-4">
              <div className="grid gap-3 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Level Student</h3>
                    <p className="mt-1 text-xs text-[#6b7890]">
                      Current level: {student.currentLevel?.name ?? "Belum diset"}
                    </p>
                  </div>
                  <details className="relative">
                    <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-2 rounded-md bg-[#0b6ffb] px-3 text-xs font-semibold text-white transition hover:bg-[#075bc9] [&::-webkit-details-marker]:hidden">
                      <Layers className="size-3.5" aria-hidden="true" />
                      Update Level
                    </summary>
                    <form
                      action={updateStudentLevel}
                      className="absolute right-0 z-30 mt-2 grid w-[min(520px,calc(100vw-2rem))] gap-3 rounded-md border border-[#dfe6ef] bg-white p-4 text-left shadow-xl"
                    >
                      <input type="hidden" name="studentId" value={student.id} />
                      <select
                        name="levelId"
                        defaultValue={student.currentLevelId ?? ""}
                        disabled={!canManageStudents}
                        className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                      >
                        <option value="">Tanpa level</option>
                        {levels.map((level) => (
                          <option key={level.id} value={level.id}>
                            {level.name}
                          </option>
                        ))}
                      </select>
                      <input
                        name="effectiveAt"
                        type="date"
                        disabled={!canManageStudents}
                        className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                      />
                      <input
                        name="notes"
                        disabled={!canManageStudents}
                        placeholder="Catatan naik level"
                        className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                      />
                      <PendingButton
                        disabled={!canManageStudents}
                        className="h-10 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                        pendingChildren="Saving..."
                      >
                        Save Level
                      </PendingButton>
                    </form>
                  </details>
                </div>

                {student.levelHistory.length > 0 ? (
                  <div className="grid gap-2 border-t border-[#e6edf5] pt-3">
                    {student.levelHistory.map((history) => (
                      <div
                        key={history.id}
                        className="flex flex-col gap-1 rounded-md bg-white px-3 py-2 text-xs text-[#536174] sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span>
                          {history.fromLevel?.name ?? "No level"} {"->"}{" "}
                          <span className="font-semibold text-[#172033]">
                            {history.toLevel?.name ?? "No level"}
                          </span>
                        </span>
                        <span>{formatDate(history.effectiveAt)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <details className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  <span>Tambah Enrollment</span>
                  <span className="grid size-9 place-items-center rounded-md bg-[#0b6ffb] text-white">
                    <Plus className="size-4" aria-hidden="true" />
                  </span>
                </summary>
                <form action={createEnrollment} className="grid gap-3 pt-4">
                  <input type="hidden" name="studentId" value={student.id} />
                      <input
                        type="hidden"
                        name="redirectTo"
                        value={`${currentPath}?tab=enrollment&enrollmentCreated=1`}
                      />
                  <select
                    name="classId"
                    required
                    defaultValue=""
                    disabled={!canCreateEnrollment}
                    className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
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
                  <div className="grid gap-3 sm:grid-cols-3">
                    <select
                      name="status"
                      defaultValue="ACTIVE"
                      disabled={!canCreateEnrollment}
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
                      disabled={!canCreateEnrollment}
                      className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                    <input
                      name="endedAt"
                      type="date"
                      disabled={!canCreateEnrollment}
                      className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                  </div>
                  <PendingButton
                    disabled={!canCreateEnrollment}
                    className="h-10 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                    pendingChildren="Menambahkan enrollment..."
                  >
                    Tambah Enrollment
                  </PendingButton>
                </form>
              </details>

              {student.enrollments.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                  Student belum punya enrollment.
                </div>
              ) : null}

              {student.enrollments.map((enrollment) => (
                <article
                  key={enrollment.id}
                  className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">
                        {enrollment.class.name}
                      </h3>
                      <p className="mt-1 text-xs text-[#6b7890]">
                        {enrollment.class.program.name} -{" "}
                        {enrollment.academicPeriod.name}
                      </p>
                      <p className="mt-2 flex items-center gap-1 text-xs text-[#536174]">
                        <GraduationCap className="size-3.5" aria-hidden="true" />
                        {enrollment.class.teacher.name}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-[#536174]">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        {enrollment.class.room?.name ?? "Tanpa room"}
                      </p>
                    </div>
                    <span className="rounded-md bg-[#e7f8ef] px-2 py-1 text-xs font-semibold text-[#16834a]">
                      {enrollment.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
            </DetailCard>
          ) : null}

          {activeTab === "billing" ? (
            <DetailCard icon={ReceiptText} title="Billing Details">
            <div className="grid gap-4">
              <details className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  <span>Buat Billing Agreement</span>
                  <span className="grid size-9 place-items-center rounded-md bg-[#0b6ffb] text-white">
                    <Plus className="size-4" aria-hidden="true" />
                  </span>
                </summary>
                <form action={createBillingAgreement} className="grid gap-3 pt-4">
                    <input
                      type="hidden"
                      name="redirectTo"
                      value={`${currentPath}?tab=billing&billingCreated=1`}
                    />
                  <select
                    name="agreementEnrollmentId"
                    required
                    defaultValue=""
                    disabled={!canCreateBillingAgreement}
                    className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  >
                    <option value="" disabled>
                      Pilih enrollment
                    </option>
                    {student.enrollments.map((enrollment) => (
                      <option key={enrollment.id} value={enrollment.id}>
                        {enrollment.class.name} - {enrollment.academicPeriod.name}
                      </option>
                    ))}
                  </select>
                  <select
                    name="agreementPricingPlanId"
                    required
                    defaultValue=""
                    disabled={!canCreateBillingAgreement}
                    className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  >
                    <option value="" disabled>
                      Pilih paket harga
                    </option>
                    {pricingPlans.map((pricingPlan) => (
                      <option key={pricingPlan.id} value={pricingPlan.id}>
                        {pricingPlan.program.name} - {pricingPlan.name} -{" "}
                        {formatCurrency(pricingPlan.price)}
                      </option>
                    ))}
                  </select>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <select
                      name="billingRule"
                      defaultValue="MONTHLY"
                      disabled={!canCreateBillingAgreement}
                      className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    >
                      {Object.entries(billingRuleLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <select
                      name="agreementStatus"
                      defaultValue="ACTIVE"
                      disabled={!canCreateBillingAgreement}
                      className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
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
                      name="amount"
                      type="number"
                      min={1}
                      required
                      disabled={!canCreateBillingAgreement}
                      placeholder="Nominal"
                      className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      name="startsAt"
                      type="date"
                      disabled={!canCreateBillingAgreement}
                      className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                    <input
                      name="endsAt"
                      type="date"
                      disabled={!canCreateBillingAgreement}
                      className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                  </div>
                  <input
                    name="notes"
                    disabled={!canCreateBillingAgreement}
                    placeholder="Catatan billing"
                    className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                  <PendingButton
                    disabled={!canCreateBillingAgreement}
                    className="h-10 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                    pendingChildren="Menyimpan agreement..."
                  >
                    Buat Billing Agreement
                  </PendingButton>
                </form>
              </details>

              <details className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  <span>Buat Invoice</span>
                  <span className="grid size-9 place-items-center rounded-md bg-[#0b6ffb] text-white">
                    <Plus className="size-4" aria-hidden="true" />
                  </span>
                </summary>
                <form action={createInvoice} className="grid gap-3 pt-4">
                    <input
                      type="hidden"
                      name="redirectTo"
                      value={`${currentPath}?tab=billing&invoiceCreated=1`}
                    />
                  <select
                    name="billingAgreementId"
                    disabled={!canCreateInvoice}
                    defaultValue=""
                    className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  >
                    <option value="">Manual tanpa agreement</option>
                    {student.billingAgreements.map((agreement) => (
                      <option key={agreement.id} value={agreement.id}>
                        {agreement.enrollment?.class.name ?? "Tanpa class"} -{" "}
                        {billingRuleLabels[agreement.billingRule]} -{" "}
                        {formatCurrency(agreement.amount)}
                      </option>
                    ))}
                  </select>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      name="enrollmentId"
                      disabled={!canCreateInvoice}
                      defaultValue=""
                      className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    >
                      <option value="">Pilih enrollment manual</option>
                      {student.enrollments.map((enrollment) => (
                        <option key={enrollment.id} value={enrollment.id}>
                          {enrollment.class.name} - {enrollment.academicPeriod.name}
                        </option>
                      ))}
                    </select>
                    <select
                      name="pricingPlanId"
                      disabled={!canCreateInvoice}
                      defaultValue=""
                      className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    >
                      <option value="">Pilih paket manual</option>
                      {pricingPlans.map((pricingPlan) => (
                        <option key={pricingPlan.id} value={pricingPlan.id}>
                          {pricingPlan.program.name} - {pricingPlan.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      name="status"
                      defaultValue="UNPAID"
                      disabled={!canCreateInvoice}
                      className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    >
                      {(["DRAFT", "UNPAID"] as const).map((status) => (
                        <option key={status} value={status}>
                          {invoiceStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                    <input
                      name="adjustmentAmount"
                      type="number"
                      defaultValue={0}
                      disabled={!canCreateInvoice}
                      placeholder="Adjustment (+/-)"
                      className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                  </div>
                  <div className="grid gap-3 rounded-md border border-[#d7e0ea] bg-white p-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          Registration fee
                        </p>
                        <p className="mt-1 text-xs text-[#6b7890]">
                          One-time per student. Bisa digabung di invoice yang
                          sama dengan paket utama.
                        </p>
                      </div>
                      {hasRegistrationFee ? (
                        <span className="w-fit rounded-md bg-[#e7f8ef] px-2 py-1 text-xs font-semibold text-[#16834a]">
                          Sudah ditagihkan
                        </span>
                      ) : null}
                    </div>
                    <input
                      name="registrationFeeAmount"
                      type="number"
                      min={0}
                      defaultValue={0}
                      disabled={!canCreateInvoice || hasRegistrationFee}
                      placeholder={
                        hasRegistrationFee
                          ? "Registration fee sudah ada"
                          : "Nominal registration fee"
                      }
                      className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                  </div>
                  <div className="grid gap-3 rounded-md border border-[#d7e0ea] bg-white p-3">
                    <div>
                      <p className="text-sm font-semibold">Item tambahan</p>
                      <p className="mt-1 text-xs text-[#6b7890]">
                        Misalnya seragam, modul, equipment, atau fee lain yang
                        mau dicampur ke invoice ini.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        name="extraLineDescription"
                        disabled={!canCreateInvoice}
                        placeholder="Nama item tambahan"
                        className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                      />
                      <input
                        name="extraLineAmount"
                        type="number"
                        min={0}
                        defaultValue={0}
                        disabled={!canCreateInvoice}
                        placeholder="Nominal item tambahan"
                        className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      name="issuedAt"
                      type="date"
                      disabled={!canCreateInvoice}
                      className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                    <input
                      name="dueAt"
                      type="date"
                      disabled={!canCreateInvoice}
                      className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                  </div>
                  <PendingButton
                    disabled={!canCreateInvoice}
                    className="h-10 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                    pendingChildren="Membuat invoice..."
                  >
                    Buat Invoice
                  </PendingButton>
                </form>
              </details>

              {student.billingAgreements.length > 0 ? (
                <div className="grid gap-3">
                  {student.billingAgreements.map((agreement) => (
                    <article
                      key={agreement.id}
                      className="rounded-md border border-[#e6edf5] bg-white p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-sm font-semibold">
                            {agreement.enrollment?.class.name ?? "Tanpa class"}
                          </h3>
                          <p className="mt-1 text-xs text-[#6b7890]">
                            {billingRuleLabels[agreement.billingRule]} -{" "}
                            {agreement.pricingPlan?.name ?? "Tanpa paket"} -{" "}
                            {formatDate(agreement.startsAt)} s/d{" "}
                            {formatDate(agreement.endsAt)}
                          </p>
                        </div>
                        <div className="shrink-0 text-left sm:text-right">
                          <p className="text-sm font-semibold text-[#0b6ffb]">
                            {formatCurrency(agreement.amount)}
                          </p>
                          <p className="mt-1 text-xs text-[#6b7890]">
                            {billingAgreementStatusLabels[agreement.status]} |{" "}
                            {agreement._count.invoices} invoice
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {student.invoices.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                  Belum ada invoice untuk student ini.
                </div>
              ) : null}

              {student.invoices.map((invoice) => {
                const paid = paidAmount(invoice);
                const balance = Math.max(invoice.total - paid, 0);

                return (
                  <article
                    key={invoice.id}
                    className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold">
                            {invoice.invoiceNumber}
                          </h3>
                          <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                            {invoice.status}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[#6b7890]">
                          {invoice.lines.map((line) => line.description).join(", ")}
                        </p>
                      </div>
                      <div className="shrink-0 text-left md:text-right">
                        <p className="text-sm font-semibold text-[#0b6ffb]">
                          {formatCurrency(invoice.total)}
                        </p>
                        <p className="mt-1 text-xs text-[#6b7890]">
                          Paid {formatCurrency(paid)} | Sisa{" "}
                          {formatCurrency(balance)}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/app/invoices/${invoice.id}/pdf`}
                      className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-[#d7e0ea] bg-white px-3 text-xs font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
                    >
                      Download PDF
                    </Link>
                  </article>
                );
              })}
            </div>
            </DetailCard>
          ) : null}

          {activeTab === "attendance" ? (
            <DetailCard icon={CalendarDays} title="Attendance Details">
              <div className="grid gap-4">
                <div className="flex flex-col gap-3 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Recent attendance</h3>
                    <p className="mt-1 text-xs text-[#6b7890]">
                      Menampilkan {attendanceRecords.length} record terakhir
                      dari enrollment student ini.
                    </p>
                  </div>
                  <Link
                    href="/app/attendance"
                    className="inline-flex h-9 w-fit items-center justify-center rounded-md bg-[#0b6ffb] px-3 text-xs font-semibold text-white transition hover:bg-[#075bc9]"
                  >
                    Open Attendance
                  </Link>
                </div>

                {attendanceRecords.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                    Belum ada attendance record untuk student ini.
                  </div>
                ) : null}

                {attendanceRecords.map((record) => (
                  <article
                    key={record.id}
                    className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">
                          {record.className}
                        </h3>
                        <p className="mt-1 text-xs text-[#6b7890]">
                          {formatDate(record.session.date)}
                          {record.notes ? ` - ${record.notes}` : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "w-fit rounded-md px-2 py-1 text-xs font-semibold",
                          attendanceStatusClasses[record.status],
                        )}
                      >
                        {attendanceStatusLabels[record.status]}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </DetailCard>
          ) : null}

          {activeTab === "profile" ? (
            <DetailCard icon={Phone} title="Contact Details">
              <div className="grid gap-6 md:grid-cols-2">
                <DetailField
                  label="Mobile No"
                  value={
                    student.phone ? (
                      <span className="flex flex-wrap items-center gap-2">
                        {student.phone}
                        <a
                          href={`tel:${student.phone}`}
                          className="rounded-md bg-[#0b6ffb] px-3 py-2 text-xs font-semibold text-white"
                        >
                          Call
                        </a>
                      </span>
                    ) : (
                      "-"
                    )
                  }
                />
                <DetailField
                  label="Parent Contact"
                  value={student.parent?.phone ?? student.parent?.email ?? "-"}
                />
              </div>
            </DetailCard>
          ) : null}

          {activeTab === "profile" ? (
            <DetailCard icon={CheckCircle2} title="Danger Zone">
              <StudentDeleteForm
                canDelete={
                  canManageStudents &&
                  student.enrollments.length === 0 &&
                  student.invoices.length === 0
                }
                studentId={student.id}
              />
            </DetailCard>
          ) : null}
        </div>
      </div>
    </AppPageShell>
  );
}
