import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  MapPin,
  Pencil,
  Phone,
  ReceiptText,
  UserCircle,
} from "lucide-react";

import { AppPageShell } from "@/app/app/app-page-shell";
import {
  StudentDeleteForm,
  StudentEditForm,
} from "@/app/app/students/student-forms";
import { DetailCard, DetailField } from "@/components/detail-card";
import { requireWorkspaceContext } from "@/lib/organization";
import { formOptionLimit, pageListLimit } from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";
import { cn } from "@/lib/utils";

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

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const { organization, membership, organizations } =
    await requireWorkspaceContext(`/app/students/${studentId}`);
  const canManageStudents = hasOrganizationPermission(
    membership,
    "students.manage",
  );

  const [student, students, parents] = await Promise.all([
    prisma.student.findFirst({
      where: { id: studentId, organizationId: organization.id },
      include: {
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
                program: true,
                room: true,
                teacher: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        invoices: {
          include: {
            lines: true,
            payments: true,
          },
          orderBy: { createdAt: "desc" },
          take: 8,
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
  const code = studentCode(student.createdAt, student.id);
  const primaryEnrollment = activeEnrollments[0] ?? student.enrollments[0];
  const detailNav = [
    { badge: null, icon: UserCircle, label: "Profile" },
    {
      badge: String(student.enrollments.length),
      icon: BookOpen,
      label: "Enrollment",
    },
    {
      badge: formatCurrency(totalOutstanding),
      icon: CreditCard,
      label: "Billing",
    },
    {
      badge: String(attendanceRecords.length),
      icon: CalendarDays,
      label: "Attendance",
    },
  ];

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
                href={`/app/students/${item.id}`}
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
                {primaryEnrollment?.class.program.level ?? "No level"}
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
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 rounded-md px-3 py-3 text-sm font-semibold text-[#172033]"
              >
                <span className="flex items-center gap-3">
                  <item.icon
                    className="size-5 text-[#0b6ffb]"
                    aria-hidden="true"
                  />
                  {item.label}
                </span>
                {item.badge ? (
                  <span className="max-w-32 truncate rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                    {item.badge}
                  </span>
                ) : null}
              </div>
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

          <DetailCard icon={UserCircle} title="Personal Details">
            <div className="grid gap-6 md:grid-cols-3">
              <DetailField label="Student Code" value={code} />
              <DetailField label="Student Name" value={student.name} />
              <DetailField label="Date Of Birth" value={formatDate(student.birthDate)} />
              <DetailField label="Parent" value={student.parent?.name ?? "-"} />
              <DetailField label="Phone" value={student.phone ?? "-"} />
              <DetailField label="Notes" value={student.notes ?? "-"} />
            </div>
          </DetailCard>

          <DetailCard icon={BookOpen} title="Academy Details">
            <div className="grid gap-4">
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

          <DetailCard icon={ReceiptText} title="Billing Details">
            <div className="grid gap-4">
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
        </div>
      </div>
    </AppPageShell>
  );
}
