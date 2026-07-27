import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  Banknote,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  Download,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Layers,
  Plus,
  QrCode,
  ReceiptText,
  Search,
  Settings,
  SlidersHorizontal,
  UserCircle,
  Users,
  Wallet,
} from "lucide-react";

import { moduleGroups } from "@/lib/orbit-data";
import { requireActiveOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/app/dashboard", active: true },
  { label: "Students", icon: Users, href: "/app/dashboard" },
  { label: "Parents", icon: Users, href: "/app/dashboard" },
  { label: "Teachers", icon: GraduationCap, href: "/app/dashboard" },
  { label: "Programs", icon: BookOpen, href: "/app/dashboard" },
  { label: "Paket", icon: Layers, href: "/app/dashboard" },
  { label: "Classes", icon: CalendarDays, href: "/app/dashboard" },
  { label: "Invoices", icon: ReceiptText, href: "/app/dashboard" },
  { label: "Profile", icon: UserCircle, href: "/app/profile" },
  { label: "Settings", icon: Settings, href: "/app/profile" },
];

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

export default async function DashboardPage() {
  const organization = await requireActiveOrganization();
  const organizationId = organization.id;
  const monthStart = getMonthStart();

  const [
    studentCount,
    activeEnrollmentCount,
    todayClassCount,
    monthlyRevenue,
    outstandingInvoices,
    newStudentCount,
    activeClasses,
    financeRows,
    recentStudents,
  ] = await Promise.all([
    prisma.student.count({ where: { organizationId } }),
    prisma.enrollment.count({ where: { organizationId, status: "ACTIVE" } }),
    prisma.class.count({ where: { organizationId } }),
    prisma.payment.aggregate({
      where: {
        organizationId,
        status: "CONFIRMED",
        paidAt: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
    prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] },
      },
      include: { payments: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.student.count({
      where: { organizationId, createdAt: { gte: monthStart } },
    }),
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
        },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  const outstandingTotal = outstandingInvoices.reduce((total, invoice) => {
    const paid = invoice.payments.reduce(
      (paymentTotal, payment) => paymentTotal + payment.amount,
      0,
    );

    return total + Math.max(invoice.total - paid, 0);
  }, 0);

  const stats = [
    {
      label: "Active Students",
      value: String(studentCount),
      delta: `${activeEnrollmentCount} enrollment aktif`,
      icon: Users,
      tone: "bg-[#eaf2ff] text-[#0b6ffb]",
    },
    {
      label: "Classes",
      value: String(todayClassCount),
      delta: "periode aktif",
      icon: CalendarDays,
      tone: "bg-[#fff3d9] text-[#9c6400]",
    },
    {
      label: "Attendance",
      value: "Ready",
      delta: "teacher CRUD",
      icon: ClipboardCheck,
      tone: "bg-[#e7f8ef] text-[#16834a]",
    },
    {
      label: "Monthly Revenue",
      value: formatCompactCurrency(monthlyRevenue._sum.amount ?? 0),
      delta: "bulan ini",
      icon: Wallet,
      tone: "bg-[#f0edff] text-[#6454d6]",
    },
    {
      label: "Outstanding",
      value: formatCompactCurrency(outstandingTotal),
      delta: `${outstandingInvoices.length} invoice`,
      icon: ReceiptText,
      tone: "bg-[#ffecec] text-[#c73535]",
    },
    {
      label: "New Students",
      value: String(newStudentCount),
      delta: "bulan ini",
      icon: Users,
      tone: "bg-[#e7fbfb] text-[#0d7d83]",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#172033]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-[#dfe6ef] bg-white px-5 py-5 lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="relative grid size-10 place-items-center overflow-hidden rounded-md bg-[#0b6ffb] text-sm font-bold text-white">
              {organization.photoUrl ? (
                <Image
                  src={organization.photoUrl}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                "O"
              )}
            </div>
            <div>
              <p className="text-lg font-semibold">Orbit</p>
              <p className="text-xs text-[#6b7890]">{organization.name}</p>
            </div>
          </div>

          <nav className="space-y-1" aria-label="Main navigation">
            {navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-[#536174] transition",
                  item.active
                    ? "bg-[#eaf2ff] text-[#075bc9]"
                    : "hover:bg-[#f1f5f9] hover:text-[#172033]",
                )}
                aria-current={item.active ? "page" : undefined}
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-[#dfe6ef] bg-white/95 px-4 py-3 backdrop-blur md:px-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-[#f5a623]">
                  {organization.name}
                </p>
                <h1 className="text-2xl font-semibold text-[#172033]">
                  Dashboard Operasional
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <label className="relative min-w-0 flex-1 md:w-72 md:flex-none">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6b7890]"
                    aria-hidden="true"
                  />
                  <span className="sr-only">Search data</span>
                  <input
                    className="h-10 w-full rounded-md border border-[#d7e0ea] bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15"
                    placeholder="Cari murid, invoice, kelas"
                  />
                </label>
                <button
                  className="grid size-10 place-items-center rounded-md border border-[#d7e0ea] bg-white text-[#536174] transition hover:bg-[#f1f5f9]"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <Bell className="size-4" aria-hidden="true" />
                </button>
                <Link
                  href="/app/profile"
                  className="grid size-10 place-items-center rounded-md border border-[#d7e0ea] bg-white text-[#536174] transition hover:bg-[#f1f5f9]"
                  aria-label="Profile"
                  title="Profile"
                >
                  <UserCircle className="size-4" aria-hidden="true" />
                </Link>
                <button className="hidden h-10 items-center gap-2 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9] sm:flex">
                  <Plus className="size-4" aria-hidden="true" />
                  Enrollment
                </button>
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
                    <div className="flex gap-2">
                      <button
                        className="grid size-9 place-items-center rounded-md border border-[#d7e0ea] text-[#536174] hover:bg-[#f1f5f9]"
                        aria-label="Filter classes"
                        title="Filter classes"
                      >
                        <SlidersHorizontal
                          className="size-4"
                          aria-hidden="true"
                        />
                      </button>
                      <button
                        className="grid size-9 place-items-center rounded-md border border-[#d7e0ea] text-[#536174] hover:bg-[#f1f5f9]"
                        aria-label="Export classes"
                        title="Export classes"
                      >
                        <Download className="size-4" aria-hidden="true" />
                      </button>
                    </div>
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
                    <button className="flex h-9 items-center gap-2 rounded-md border border-[#d7e0ea] px-3 text-sm font-semibold text-[#536174] hover:bg-[#f1f5f9]">
                      Semester 2 2026
                      <ChevronDown className="size-4" aria-hidden="true" />
                    </button>
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
                  <div className="border-b border-[#e6edf5] px-4 py-4">
                    <h2 className="text-base font-semibold">
                      Finance Snapshot
                    </h2>
                    <p className="text-sm text-[#6b7890]">
                      Invoice mengikuti billing, bukan enrollment.
                    </p>
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
                  </div>
                </section>

                <section className="rounded-md border border-[#dfe6ef] bg-white shadow-sm">
                  <div className="border-b border-[#e6edf5] px-4 py-4">
                    <h2 className="text-base font-semibold">
                      Recent Students
                    </h2>
                    <p className="text-sm text-[#6b7890]">
                      Satu murid bisa ikut lebih dari satu program.
                    </p>
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
