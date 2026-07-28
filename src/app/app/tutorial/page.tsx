import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Layers,
  Lightbulb,
  ListChecks,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

import { AppPageShell } from "@/app/app/app-page-shell";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/organization";

export const dynamic = "force-dynamic";

const quickLinks = [
  { label: "Parents", href: "/app/parents", icon: Users },
  { label: "Students", href: "/app/students", icon: Users },
  { label: "Teachers", href: "/app/teachers", icon: GraduationCap },
  { label: "Programs", href: "/app/programs", icon: BookOpen },
  { label: "Paket", href: "/app/packages", icon: Layers },
  { label: "Classes", href: "/app/classes", icon: CalendarDays },
  { label: "Enrollments", href: "/app/enrollments", icon: UserPlus },
  { label: "Attendance", href: "/app/attendance", icon: ClipboardCheck },
  { label: "Invoices", href: "/app/invoices", icon: ReceiptText },
  { label: "Members", href: "/app/members", icon: ShieldCheck },
] satisfies Array<{
  label: string;
  href: string;
  icon: LucideIcon;
}>;

const workflowSteps = [
  {
    title: "1. Rapikan workspace dan akses",
    href: "/app/profile",
    icon: ShieldCheck,
    purpose:
      "Pastikan nama, logo, alamat, email, nomor WhatsApp, member, dan role organization sudah benar.",
    example:
      "Owner membuat workspace Racer Robotic GDC, upload logo, lalu invite admin finance dengan role yang hanya bisa kelola invoice dan payment.",
    output:
      "Invoice sudah pakai identitas tempat les, dan tiap member punya batas akses yang jelas.",
  },
  {
    title: "2. Masukkan data orang",
    href: "/app/students",
    icon: Users,
    purpose:
      "Buat parent, student, dan teacher sebelum masuk ke jadwal atau tagihan.",
    example:
      "Parent: Bunda Nadia. Student: Fabio Narendra Anugrah. Teacher: Raffi Kamal Ikhsan.",
    output:
      "Student bisa ditautkan ke parent, teacher siap dipakai saat membuat kelas.",
  },
  {
    title: "3. Buat katalog belajar",
    href: "/app/programs",
    icon: BookOpen,
    purpose:
      "Program mendefinisikan produk belajar, sedangkan paket/pricing plan mendefinisikan harga dan aturan billing.",
    example:
      "Program: Coding Class - Semester, level Intermediate, durasi 90 menit. Paket: Term Fee Rp1.150.000.",
    output:
      "Kelas dan invoice punya sumber harga yang konsisten.",
  },
  {
    title: "4. Susun kelas aktif",
    href: "/app/classes",
    icon: CalendarDays,
    purpose:
      "Gabungkan program, teacher, room, periode akademik, hari, jam mulai, dan kapasitas kelas.",
    example:
      "Kelas ONL_SMART_WED_1 berjalan Rabu 16:00 untuk periode Sep-Des 2026.",
    output:
      "Kelas siap menerima murid lewat enrollment dan bisa dibuat absensinya.",
  },
  {
    title: "5. Enrollment murid ke kelas",
    href: "/app/enrollments",
    icon: UserPlus,
    purpose:
      "Enrollment adalah kontrak akademik: student ikut class tertentu dalam academic period tertentu.",
    example:
      "Fabio masuk kelas ONL_SMART_WED_1 pada periode September-Desember dengan status Active.",
    output:
      "Student muncul di daftar kelas, attendance, dan bisa ditagihkan invoice.",
  },
  {
    title: "6. Jalankan attendance",
    href: "/app/attendance",
    icon: ClipboardCheck,
    purpose:
      "Buat sesi absensi per kelas dan tanggal, lalu update status setiap enrolled student.",
    example:
      "Tanggal 2026-09-23, kelas Coding Rabu dibuat session. Fabio ditandai Present, murid izin ditandai Excused.",
    output:
      "Dashboard attendance rate dan riwayat kehadiran mulai terbaca.",
  },
  {
    title: "7. Terbitkan invoice dan payment",
    href: "/app/invoices",
    icon: ReceiptText,
    purpose:
      "Buat invoice dari student/enrollment, pilih paket harga, lalu catat payment saat orang tua bayar.",
    example:
      "Invoice INV/HQ/00003 untuk Fabio memakai paket Term Fee Rp1.150.000 dan bisa download PDF dengan logo organization.",
    output:
      "Outstanding, monthly revenue, dan status pembayaran di dashboard ikut update.",
  },
  {
    title: "8. Review dashboard setiap hari",
    href: "/app/dashboard",
    icon: ListChecks,
    purpose:
      "Dashboard dipakai untuk memantau kelas aktif, absensi terbaru, outstanding payment, dan aktivitas baru.",
    example:
      "Admin pagi hari cek kelas hari ini, sore cek attendance yang belum lengkap, finance cek invoice unpaid.",
    output:
      "Owner bisa melihat kondisi tempat les tanpa bongkar data satu-satu.",
  },
] satisfies Array<{
  title: string;
  href: string;
  icon: LucideIcon;
  purpose: string;
  example: string;
  output: string;
}>;

const operatingRules = [
  "Buat parent dan student sebelum enrollment supaya data keluarga rapi dari awal.",
  "Buat program dan paket sebelum kelas supaya harga invoice tidak diinput manual berulang.",
  "Enrollment aktif adalah sumber utama attendance dan invoice.",
  "Kalau murid pindah kelas, tutup enrollment lama lalu buat enrollment baru agar history tetap bersih.",
  "Logo organization di Profile akan dipakai otomatis di PDF invoice.",
  "Role berlaku per organization, jadi orang yang sama bisa Owner di satu tempat les dan Staff di tempat les lain.",
];

const commonMistakes = [
  "Langsung membuat invoice sebelum enrollment, akhirnya invoice tidak punya konteks kelas/periode.",
  "Membuat kelas tanpa teacher yang benar, lalu attendance sulit dipertanggungjawabkan.",
  "Menghapus data master yang sudah punya transaksi. Lebih aman ubah status atau buat data baru untuk periode berikutnya.",
  "Memakai satu paket untuk semua program padahal harga tiap program berbeda.",
];

function statusTone(count: number) {
  return count > 0
    ? "border-[#c8ead8] bg-[#f1fbf6] text-[#16834a]"
    : "border-[#dfe6ef] bg-white text-[#6b7890]";
}

export default async function TutorialPage() {
  const { organization, membership, organizations } =
    await requireWorkspaceContext("/app/tutorial");
  const organizationId = organization.id;

  const [
    parentCount,
    studentCount,
    teacherCount,
    programCount,
    pricingPlanCount,
    classCount,
    enrollmentCount,
    attendanceSessionCount,
    invoiceCount,
  ] = await Promise.all([
    prisma.parent.count({ where: { organizationId } }),
    prisma.student.count({ where: { organizationId } }),
    prisma.teacher.count({ where: { organizationId } }),
    prisma.program.count({ where: { organizationId } }),
    prisma.pricingPlan.count({ where: { organizationId } }),
    prisma.class.count({ where: { organizationId } }),
    prisma.enrollment.count({ where: { organizationId } }),
    prisma.attendanceSession.count({ where: { organizationId } }),
    prisma.invoice.count({ where: { organizationId } }),
  ]);

  const setupStatus = [
    { label: "Parents", count: parentCount, href: "/app/parents" },
    { label: "Students", count: studentCount, href: "/app/students" },
    { label: "Teachers", count: teacherCount, href: "/app/teachers" },
    { label: "Programs", count: programCount, href: "/app/programs" },
    { label: "Paket", count: pricingPlanCount, href: "/app/packages" },
    { label: "Classes", count: classCount, href: "/app/classes" },
    { label: "Enrollments", count: enrollmentCount, href: "/app/enrollments" },
    {
      label: "Attendance",
      count: attendanceSessionCount,
      href: "/app/attendance",
    },
    { label: "Invoices", count: invoiceCount, href: "/app/invoices" },
  ];

  const activeRole = membership.customRole?.name ?? membership.role;

  return (
    <AppPageShell
      activePath="/app/tutorial"
      activeRole={activeRole}
      eyebrow="Tutorial"
      organization={organization}
      organizations={organizations}
      title="Alur Kerja Orbit"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-md border border-[#dfe6ef] bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-md bg-[#eaf2ff] text-[#075bc9]">
                <Sparkles className="size-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase text-[#f5a623]">
                  Mulai dari sini
                </p>
                <h2 className="mt-2 text-3xl font-semibold leading-tight">
                  Orbit dipakai sebagai operating system untuk tempat les.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#536174]">
                  Urutannya sederhana: siapkan workspace, isi data orang,
                  bentuk produk belajar, buka kelas, enroll murid, jalankan
                  attendance, lalu terbitkan invoice. Semua data terkunci di
                  organization aktif, jadi satu akun bisa mengelola banyak
                  tempat les tanpa data tercampur.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {quickLinks.slice(0, 5).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex h-11 items-center justify-center gap-2 rounded-md border border-[#d7e0ea] bg-[#fbfcfe] px-3 text-sm font-semibold text-[#536174] transition hover:border-[#0b6ffb] hover:bg-[#eef5ff] hover:text-[#075bc9]"
                >
                  <item.icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {quickLinks.slice(5).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex h-11 items-center justify-center gap-2 rounded-md border border-[#d7e0ea] bg-[#fbfcfe] px-3 text-sm font-semibold text-[#536174] transition hover:border-[#0b6ffb] hover:bg-[#eef5ff] hover:text-[#075bc9]"
                >
                  <item.icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-[#dfe6ef] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase text-[#f5a623]">
                  Workspace aktif
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {organization.name}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6b7890]">
                  Status setup ini dibaca langsung dari database organization
                  aktif.
                </p>
              </div>
              <Link
                href="/app/profile"
                className="flex h-10 shrink-0 items-center gap-2 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9]"
              >
                Profile
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-5 grid gap-2">
              {setupStatus.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm font-semibold transition hover:border-[#0b6ffb] hover:bg-[#eef5ff] ${statusTone(
                    item.count,
                  )}`}
                >
                  <span>{item.label}</span>
                  <span>{item.count}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-md border border-[#dfe6ef] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-[#e6edf5] pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-[#f5a623]">
                Contoh kasus
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Racer Robotic GDC membuka semester baru
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[#6b7890]">
              Ikuti alur ini kalau tempat les baru mulai pakai Orbit atau
              sedang menyiapkan batch/periode belajar baru.
            </p>
          </div>

          <div className="grid gap-4 pt-5 md:grid-cols-2">
            {workflowSteps.map((step) => (
              <article
                key={step.title}
                className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-md bg-white text-[#0b6ffb] ring-1 ring-[#d7e0ea]">
                    <step.icon className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#536174]">
                      {step.purpose}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 border-t border-[#e6edf5] pt-4 text-sm leading-6">
                  <p>
                    <span className="font-semibold text-[#172033]">
                      Contoh:
                    </span>{" "}
                    <span className="text-[#536174]">{step.example}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-[#172033]">
                      Hasil:
                    </span>{" "}
                    <span className="text-[#536174]">{step.output}</span>
                  </p>
                </div>

                <Link
                  href={step.href}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:border-[#0b6ffb] hover:bg-[#eef5ff] hover:text-[#075bc9]"
                >
                  Buka modul
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-md border border-[#dfe6ef] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-md bg-[#e7f8ef] text-[#16834a]">
                <CheckCircle2 className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase text-[#f5a623]">
                  Aturan main
                </p>
                <h2 className="text-xl font-semibold">Urutan yang paling aman</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {operatingRules.map((rule) => (
                <div
                  key={rule}
                  className="flex gap-3 rounded-md border border-[#e6edf5] bg-[#fbfcfe] px-3 py-3 text-sm leading-6 text-[#536174]"
                >
                  <CheckCircle2
                    className="mt-1 size-4 shrink-0 text-[#16834a]"
                    aria-hidden="true"
                  />
                  {rule}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-[#dfe6ef] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-md bg-[#fff3d9] text-[#9c6400]">
                <Lightbulb className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase text-[#f5a623]">
                  Hindari ini
                </p>
                <h2 className="text-xl font-semibold">Kesalahan yang sering terjadi</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {commonMistakes.map((mistake) => (
                <div
                  key={mistake}
                  className="flex gap-3 rounded-md border border-[#e6edf5] bg-[#fbfcfe] px-3 py-3 text-sm leading-6 text-[#536174]"
                >
                  <FileText
                    className="mt-1 size-4 shrink-0 text-[#0b6ffb]"
                    aria-hidden="true"
                  />
                  {mistake}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppPageShell>
  );
}
