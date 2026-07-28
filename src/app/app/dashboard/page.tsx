import { AttendanceStatus } from "@prisma/client";
import Link from "next/link";
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileText,
  GraduationCap,
  Plus,
  QrCode,
  ReceiptText,
  ShieldCheck,
  UserCircle,
  Users,
  Wallet,
} from "lucide-react";

import { AppSidebar } from "@/app/app/app-navigation";
import { OrganizationSwitcher } from "@/app/app/organization-switcher";
import { DashboardMetricsChart } from "@/components/dashboard-metrics-chart";
import { moduleGroups } from "@/lib/orbit-data";
import { requireWorkspaceContext } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const paymentIcons = {
  CASH: Banknote,
  TRANSFER: CreditCard,
  QRIS: QrCode,
  NONE: ReceiptText,
};

const paymentLabels = {
  CASH: "Cash",
  TRANSFER: "Transfer",
  QRIS: "QRIS",
  NONE: "Belum dibayar",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(value: number) {
  if (value >= 1000000) {
    return `Rp${(value / 1000000).toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    })} jt`;
  }

  return formatCurrency(value);
}

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

type DashboardSummaryRow = {
  absentCount: number;
  attendanceRecordCount: number;
  attendanceSessionCount: number;
  studentCount: number;
  activeEnrollmentCount: number;
  classCount: number;
  lateCount: number;
  monthlyRevenue: number;
  outstandingCount: number;
  outstandingTotal: number;
  presentCount: number;
  newStudentCount: number;
};

type DashboardMetricRow = {
  activeStudents: number;
  attendanceRate: number;
  label: string;
  monthStart: Date;
  newStudents: number;
  revenue: number;
};

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

export default async function DashboardPage() {
  const { organization, membership, organizations } =
    await requireWorkspaceContext("/app/dashboard");
  const organizationId = organization.id;
  const monthStart = getMonthStart();

  const [
    summaryRows,
    activeClasses,
    metricRows,
    financeRows,
    recentStudents,
    recentAttendance,
  ] = await Promise.all([
    prisma.$queryRaw<DashboardSummaryRow[]>`
      SELECT
        (SELECT COUNT(*)::int FROM "Student" WHERE "organizationId" = ${organizationId}) AS "studentCount",
        (SELECT COUNT(*)::int FROM "Enrollment" WHERE "organizationId" = ${organizationId} AND status = 'ACTIVE') AS "activeEnrollmentCount",
        (SELECT COUNT(*)::int FROM "Class" WHERE "organizationId" = ${organizationId}) AS "classCount",
        (SELECT COUNT(*)::int FROM "AttendanceSession" WHERE "organizationId" = ${organizationId} AND date >= ${monthStart}) AS "attendanceSessionCount",
        (SELECT COUNT(*)::int FROM "AttendanceRecord" ar INNER JOIN "AttendanceSession" s ON s.id = ar."sessionId" WHERE ar."organizationId" = ${organizationId} AND s.date >= ${monthStart}) AS "attendanceRecordCount",
        (SELECT COUNT(*)::int FROM "AttendanceRecord" ar INNER JOIN "AttendanceSession" s ON s.id = ar."sessionId" WHERE ar."organizationId" = ${organizationId} AND s.date >= ${monthStart} AND ar.status = 'PRESENT') AS "presentCount",
        (SELECT COUNT(*)::int FROM "AttendanceRecord" ar INNER JOIN "AttendanceSession" s ON s.id = ar."sessionId" WHERE ar."organizationId" = ${organizationId} AND s.date >= ${monthStart} AND ar.status = 'ABSENT') AS "absentCount",
        (SELECT COUNT(*)::int FROM "AttendanceRecord" ar INNER JOIN "AttendanceSession" s ON s.id = ar."sessionId" WHERE ar."organizationId" = ${organizationId} AND s.date >= ${monthStart} AND ar.status = 'LATE') AS "lateCount",
        COALESCE((
          SELECT SUM(amount)::int
          FROM "Payment"
          WHERE "organizationId" = ${organizationId}
            AND status = 'CONFIRMED'
            AND "paidAt" >= ${monthStart}
        ), 0) AS "monthlyRevenue",
        (SELECT COUNT(*)::int FROM "Invoice" WHERE "organizationId" = ${organizationId} AND status IN ('UNPAID', 'PARTIAL', 'OVERDUE')) AS "outstandingCount",
        COALESCE((
          SELECT SUM(GREATEST(i.total - COALESCE(paid.amount, 0), 0))::int
          FROM "Invoice" i
          LEFT JOIN (
            SELECT "invoiceId", SUM(amount)::int AS amount
            FROM "Payment"
            WHERE "organizationId" = ${organizationId}
              AND status = 'CONFIRMED'
            GROUP BY "invoiceId"
          ) paid ON paid."invoiceId" = i.id
          WHERE i."organizationId" = ${organizationId}
            AND i.status IN ('UNPAID', 'PARTIAL', 'OVERDUE')
        ), 0) AS "outstandingTotal",
        (SELECT COUNT(*)::int FROM "Student" WHERE "organizationId" = ${organizationId} AND "createdAt" >= ${monthStart}) AS "newStudentCount"
    `,
    prisma.class.findMany({
      where: { organizationId },
      include: {
        program: true,
        teacher: true,
        room: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startsAt: "asc" }],
      take: 4,
    }),
    prisma.$queryRaw<DashboardMetricRow[]>`
      WITH months AS (
        SELECT
          (
            date_trunc('month', CURRENT_DATE)
            - (series.index * interval '1 month')
          )::date AS month_start
        FROM generate_series(11, 0, -1) AS series(index)
      ),
      attendance AS (
        SELECT
          date_trunc('month', s.date)::date AS month_start,
          COUNT(ar.id)::int AS total_records,
          COUNT(ar.id) FILTER (WHERE ar.status = 'PRESENT')::int AS present_records
        FROM "AttendanceSession" s
        LEFT JOIN "AttendanceRecord" ar ON ar."sessionId" = s.id
        WHERE s."organizationId" = ${organizationId}
          AND s.date >= (SELECT MIN(month_start) FROM months)
        GROUP BY date_trunc('month', s.date)::date
      )
      SELECT
        m.month_start AS "monthStart",
        to_char(m.month_start, 'Mon') AS label,
        (
          SELECT COUNT(*)::int
          FROM "Student" student
          WHERE student."organizationId" = ${organizationId}
            AND student."createdAt" >= m.month_start
            AND student."createdAt" < (m.month_start + interval '1 month')
        ) AS "newStudents",
        (
          SELECT COUNT(DISTINCT enrollment."studentId")::int
          FROM "Enrollment" enrollment
          WHERE enrollment."organizationId" = ${organizationId}
            AND enrollment.status = 'ACTIVE'
            AND enrollment."joinedAt" < (m.month_start + interval '1 month')
            AND (
              enrollment."endedAt" IS NULL
              OR enrollment."endedAt" >= m.month_start
            )
        ) AS "activeStudents",
        COALESCE((
          SELECT SUM(payment.amount)::int
          FROM "Payment" payment
          WHERE payment."organizationId" = ${organizationId}
            AND payment.status = 'CONFIRMED'
            AND payment."paidAt" >= m.month_start
            AND payment."paidAt" < (m.month_start + interval '1 month')
        ), 0) AS revenue,
        COALESCE(
          ROUND(
            (attendance.present_records::numeric / NULLIF(attendance.total_records, 0))
            * 100
          )::int,
          0
        ) AS "attendanceRate"
      FROM months m
      LEFT JOIN attendance ON attendance.month_start = m.month_start
      ORDER BY m.month_start ASC
    `,
    prisma.invoice.findMany({
      where: { organizationId },
      include: {
        student: true,
        payments: { orderBy: { paidAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.student.findMany({
      where: { organizationId },
      include: {
        enrollments: {
          include: { class: { include: { program: true } } },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.attendanceSession.findMany({
      where: { organizationId },
      include: {
        class: {
          include: {
            program: true,
            teacher: true,
          },
        },
        records: {
          include: {
            enrollment: {
              include: {
                student: true,
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
      take: 4,
    }),
  ]);

  const summary = summaryRows[0] ?? {
    absentCount: 0,
    activeEnrollmentCount: 0,
    attendanceRecordCount: 0,
    attendanceSessionCount: 0,
    classCount: 0,
    lateCount: 0,
    monthlyRevenue: 0,
    newStudentCount: 0,
    outstandingCount: 0,
    outstandingTotal: 0,
    presentCount: 0,
    studentCount: 0,
  };
  const metricData = metricRows.map((row) => ({
    activeStudents: Number(row.activeStudents),
    attendanceRate: Number(row.attendanceRate),
    label: row.label.trim(),
    newStudents: Number(row.newStudents),
    revenue: Number(row.revenue),
  }));

  const stats = [
    {
      label: "Active Students",
      value: String(summary.studentCount),
      delta: `${summary.activeEnrollmentCount} enrollment aktif`,
      icon: Users,
      tone: "bg-[#eaf2ff] text-[#0b6ffb]",
    },
    {
      label: "Classes",
      value: String(summary.classCount),
      delta: "periode aktif",
      icon: CalendarDays,
      tone: "bg-[#fff3d9] text-[#9c6400]",
    },
    {
      label: "Attendance",
      value: String(summary.attendanceSessionCount),
      delta: `${summary.presentCount} present bulan ini`,
      icon: ClipboardCheck,
      tone: "bg-[#e7f8ef] text-[#16834a]",
    },
    {
      label: "Monthly Revenue",
      value: formatCompactCurrency(summary.monthlyRevenue),
      delta: "bulan ini",
      icon: Wallet,
      tone: "bg-[#f0edff] text-[#6454d6]",
    },
    {
      label: "Outstanding",
      value: formatCompactCurrency(summary.outstandingTotal),
      delta: `${summary.outstandingCount} invoice`,
      icon: ReceiptText,
      tone: "bg-[#ffecec] text-[#c73535]",
    },
    {
      label: "New Students",
      value: String(summary.newStudentCount),
      delta: "bulan ini",
      icon: Users,
      tone: "bg-[#e7fbfb] text-[#0d7d83]",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#172033]">
      <div className="flex min-h-screen">
        <AppSidebar activePath="/app/dashboard" organization={organization} />

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-[#dfe6ef] bg-white/95 px-4 py-3 backdrop-blur md:px-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-[#f5a623]">
                  {organization.name}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold text-[#172033]">
                    Dashboard Operasional
                  </h1>
                  <span className="inline-flex h-7 items-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-2 text-xs font-semibold text-[#536174]">
                    <ShieldCheck className="size-3.5 text-[#16834a]" />
                    {membership.customRole?.name ?? membership.role}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <OrganizationSwitcher
                  activeOrganization={organization}
                  activeRole={membership.customRole?.name ?? membership.role}
                  organizations={organizations}
                  currentPath="/app/dashboard"
                />
                <Link
                  href="/app/profile"
                  className="grid size-10 place-items-center rounded-md border border-[#d7e0ea] bg-white text-[#536174] transition hover:bg-[#f1f5f9]"
                  aria-label="Profile"
                  title="Profile"
                >
                  <UserCircle className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/app/students"
                  className="hidden h-10 items-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9] sm:flex"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Student
                </Link>
                <Link
                  href="/app/enrollments"
                  className="hidden h-10 items-center gap-2 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9] sm:flex"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Enrollment
                </Link>
              </div>
            </div>
          </header>

          <div className="space-y-6 px-4 py-6 md:px-8">
            <section
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
              aria-label="Dashboard summary"
            >
              {stats.map((stat) => (
                <article
                  key={stat.label}
                  className="rounded-md border border-[#dfe6ef] bg-white p-4 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span
                      className={cn(
                        "grid size-9 place-items-center rounded-md",
                        stat.tone,
                      )}
                    >
                      <stat.icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-medium text-[#6b7890]">
                      {stat.delta}
                    </span>
                  </div>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  <p className="mt-1 text-sm text-[#6b7890]">{stat.label}</p>
                </article>
              ))}
            </section>

            <DashboardMetricsChart data={metricData} />

            <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
              <div className="space-y-6">
                <section className="rounded-md border border-[#dfe6ef] bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-[#e6edf5] px-4 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-base font-semibold">
                        Kelas Aktif
                      </h2>
                      <p className="text-sm text-[#6b7890]">
                        Data ini dibaca dari database organization.
                      </p>
                    </div>
                    <Link
                      href="/app/classes"
                      className="inline-flex h-9 items-center justify-center rounded-md border border-[#d7e0ea] px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
                    >
                      View Classes
                    </Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="bg-[#f8fafc] text-xs uppercase text-[#6b7890]">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Class</th>
                          <th className="px-4 py-3 font-semibold">Teacher</th>
                          <th className="px-4 py-3 font-semibold">Room</th>
                          <th className="px-4 py-3 font-semibold">Schedule</th>
                          <th className="px-4 py-3 font-semibold">Capacity</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#edf2f7]">
                        {activeClasses.map((classItem) => (
                          <tr key={classItem.id}>
                            <td className="px-4 py-4">
                              <div className="font-semibold text-[#172033]">
                                {classItem.name}
                              </div>
                              <div className="text-xs text-[#6b7890]">
                                {classItem.program.name}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {classItem.teacher.name}
                            </td>
                            <td className="px-4 py-4">
                              {classItem.room?.name ?? "-"}
                            </td>
                            <td className="px-4 py-4">
                              {classItem.startsAt}
                              {classItem.endsAt ? `-${classItem.endsAt}` : ""}
                            </td>
                            <td className="px-4 py-4">
                              {classItem._count.enrollments}/
                              {classItem.maxStudents}
                            </td>
                            <td className="px-4 py-4">
                              <span className="inline-flex items-center gap-1 rounded-md bg-[#e7f8ef] px-2 py-1 text-xs font-semibold text-[#16834a]">
                                <CheckCircle2
                                  className="size-3"
                                  aria-hidden="true"
                                />
                                Active
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {activeClasses.length === 0 ? (
                      <div className="p-5 text-center text-sm text-[#6b7890]">
                        Belum ada class. Buat class dulu sebelum enrollment dan
                        attendance.
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-md border border-[#dfe6ef] bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#e6edf5] px-4 py-4">
                    <div>
                      <h2 className="text-base font-semibold">
                        Student Flow
                      </h2>
                      <p className="text-sm text-[#6b7890]">
                        Alur dari parent sampai active student.
                      </p>
                    </div>
                    <Link
                      href="/app/enrollments"
                      className="inline-flex h-9 items-center justify-center rounded-md border border-[#d7e0ea] px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
                    >
                      Manage Flow
                    </Link>
                  </div>
                  <div className="grid gap-3 p-4 md:grid-cols-4">
                    {moduleGroups.flow.map((step, index) => (
                      <div
                        key={step}
                        className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3"
                      >
                        <p className="text-xs font-semibold text-[#0b6ffb]">
                          Step {index + 1}
                        </p>
                        <p className="mt-1 text-sm font-semibold">{step}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-md border border-[#dfe6ef] bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#e6edf5] px-4 py-4">
                    <div>
                      <h2 className="text-base font-semibold">
                        Finance Snapshot
                      </h2>
                      <p className="text-sm text-[#6b7890]">
                        Invoice mengikuti billing, bukan enrollment.
                      </p>
                    </div>
                    <Link
                      href="/app/invoices"
                      className="inline-flex h-9 items-center justify-center rounded-md border border-[#d7e0ea] px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
                    >
                      Invoices
                    </Link>
                  </div>
                  <div className="divide-y divide-[#edf2f7]">
                    {financeRows.map((row) => {
                      const method = row.payments[0]?.method ?? "NONE";
                      const PaymentIcon = paymentIcons[method];

                      return (
                        <div
                          key={row.invoiceNumber}
                          className="flex items-center gap-3 px-4 py-4"
                        >
                          <span className="grid size-10 place-items-center rounded-md bg-[#eef5ff] text-[#0b6ffb]">
                            <PaymentIcon className="size-4" aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-sm font-semibold">
                                {row.invoiceNumber}
                              </p>
                              <p className="text-sm font-semibold">
                                {formatCurrency(row.total)}
                              </p>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-3 text-xs text-[#6b7890]">
                              <span className="truncate">
                                {row.student.name}
                              </span>
                              <span>{paymentLabels[method]}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {financeRows.length === 0 ? (
                      <div className="px-4 py-5 text-sm text-[#6b7890]">
                        Belum ada invoice.
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-md border border-[#dfe6ef] bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#e6edf5] px-4 py-4">
                    <div>
                      <h2 className="text-base font-semibold">
                        Recent Attendance
                      </h2>
                      <p className="text-sm text-[#6b7890]">
                        Session terakhir dari class attendance.
                      </p>
                    </div>
                    <Link
                      href="/app/attendance"
                      className="inline-flex h-9 items-center justify-center rounded-md border border-[#d7e0ea] px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
                    >
                      Attendance
                    </Link>
                  </div>
                  <div className="divide-y divide-[#edf2f7]">
                    {recentAttendance.map((session) => {
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

                      return (
                        <div key={session.id} className="px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {session.class.name}
                              </p>
                              <p className="mt-1 text-xs text-[#6b7890]">
                                {new Intl.DateTimeFormat("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }).format(session.date)}{" "}
                                - {session.class.teacher.name}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-md bg-[#f1f5f9] px-2 py-1 text-xs font-semibold text-[#536174]">
                              {session.records.length} records
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
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
                      );
                    })}
                    {recentAttendance.length === 0 ? (
                      <div className="px-4 py-5 text-sm text-[#6b7890]">
                        Belum ada attendance session.
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-md border border-[#dfe6ef] bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#e6edf5] px-4 py-4">
                    <div>
                      <h2 className="text-base font-semibold">
                        Recent Students
                      </h2>
                      <p className="text-sm text-[#6b7890]">
                        Satu murid bisa ikut lebih dari satu program.
                      </p>
                    </div>
                    <Link
                      href="/app/students"
                      className="inline-flex h-9 items-center justify-center rounded-md border border-[#d7e0ea] px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
                    >
                      Students
                    </Link>
                  </div>
                  <div className="divide-y divide-[#edf2f7]">
                    {recentStudents.map((student) => {
                      const programs = Array.from(
                        new Set(
                          student.enrollments.map(
                            (enrollment) => enrollment.class.program.name,
                          ),
                        ),
                      );

                      return (
                        <div
                          key={student.id}
                          className="flex items-center gap-3 px-4 py-4"
                        >
                          <div className="grid size-10 place-items-center rounded-md bg-[#fff3d9] text-[#9c6400]">
                            <GraduationCap
                              className="size-4"
                              aria-hidden="true"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {student.name}
                            </p>
                            <p className="truncate text-xs text-[#6b7890]">
                              {programs.join(", ") || "Belum enrollment"}
                            </p>
                          </div>
                          <span className="rounded-md bg-[#e7f8ef] px-2 py-1 text-xs font-semibold text-[#16834a]">
                            Active
                          </span>
                        </div>
                      );
                    })}
                    {recentStudents.length === 0 ? (
                      <div className="px-4 py-5 text-sm text-[#6b7890]">
                        Belum ada student.
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>
            </section>

            <section className="rounded-md border border-[#dfe6ef] bg-white shadow-sm">
              <div className="border-b border-[#e6edf5] px-4 py-4">
                <h2 className="text-base font-semibold">MVP Modules</h2>
                <p className="text-sm text-[#6b7890]">
                  Modul awal yang diturunkan langsung dari PRD v1.
                </p>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                {moduleGroups.mvp.map((module) => (
                  <div
                    key={module}
                    className="flex min-h-16 items-center gap-3 rounded-md border border-[#e6edf5] bg-[#fbfcfe] px-3 py-3"
                  >
                    <FileText className="size-4 text-[#0b6ffb]" aria-hidden />
                    <span className="text-sm font-medium">{module}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-md border border-[#dfe6ef] bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-[#075bc9]">
                  <Wallet className="size-4" aria-hidden="true" />
                  <h2 className="text-sm font-semibold">Billing Rule</h2>
                </div>
                <p className="text-sm leading-6 text-[#536174]">
                  Pricing plan menyimpan harga dan billing rule. Enrollment tetap
                  aktif walaupun paket berubah.
                </p>
              </div>
              <div className="rounded-md border border-[#dfe6ef] bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-[#16834a]">
                  <ClipboardCheck className="size-4" aria-hidden="true" />
                  <h2 className="text-sm font-semibold">Attendance</h2>
                </div>
                <p className="text-sm leading-6 text-[#536174]">
                  Teacher dapat melihat kelas, daftar murid, dan melakukan
                  absensi sesuai permission matrix.
                </p>
              </div>
              <div className="rounded-md border border-[#dfe6ef] bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-[#c73535]">
                  <AlertCircle className="size-4" aria-hidden="true" />
                  <h2 className="text-sm font-semibold">Invoice Rule</h2>
                </div>
                <p className="text-sm leading-6 text-[#536174]">
                  Invoice yang sudah diterbitkan tidak diubah nominalnya. Koreksi
                  dibuat sebagai invoice baru atau adjustment.
                </p>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
