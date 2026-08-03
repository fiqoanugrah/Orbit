import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Cloud,
  CreditCard,
  FileText,
  Mail,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Star,
  Table2,
  Users,
  Video,
  WalletCards,
} from "lucide-react";

import { OrbitMark } from "@/components/orbit-mark";

export const dynamic = "force-dynamic";

const navItems = ["Fitur", "Keuntungan", "Harga", "Testimoni", "FAQ"];

const trustBadges = [
  { label: "Mudah digunakan", icon: ShieldCheck },
  { label: "Aman & Terpercaya", icon: ShieldCheck },
  { label: "Cloud Based", icon: Cloud },
];

const stats = [
  { value: "200+", label: "Organizations", icon: Building2 },
  { value: "4.800+", label: "Students", icon: Users },
  { value: "18.000+", label: "Invoices", icon: FileText },
  { value: "99.9%", label: "Uptime", icon: ShieldCheck },
];

const workflow = [
  { label: "Daftar Murid", icon: Users },
  { label: "Masuk Kelas", icon: BookOpen },
  { label: "Absensi", icon: CalendarCheck },
  { label: "Invoice Otomatis", icon: ReceiptText },
  { label: "Pembayaran", icon: CreditCard },
  { label: "Laporan", icon: BarChart3 },
];

const reasons = [
  {
    title: "Multi Organization",
    body: "Satu akun untuk mengelola banyak cabang atau brand.",
    icon: Building2,
  },
  {
    title: "Real-time Dashboard",
    body: "Pantau performa bisnis kapan saja dari satu layar.",
    icon: BarChart3,
  },
  {
    title: "Flexible Billing",
    body: "Dukung pembayaran bulanan, semester, dan biaya tambahan.",
    icon: WalletCards,
  },
];

const testimonials = [
  {
    name: "Racer Depok",
    role: "Owner",
    quote:
      "Sebelum Orbit data masih di Excel. Sekarang jauh lebih rapi dan hemat waktu setiap hari.",
  },
  {
    name: "Smart Study",
    role: "Admin",
    quote:
      "Fitur invoice otomatisnya sangat membantu. Orang tua juga lebih mudah melunasi pembayaran.",
  },
  {
    name: "EduPrime",
    role: "Owner",
    quote:
      "Dashboard-nya lengkap dan mudah dipahami. Cocok untuk banyak cabang seperti kami.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "Rp99 rb",
    note: "Untuk tempat les kecil",
    features: ["Hingga 50 murid", "5 kelas", "Invoice & Payment", "Laporan dasar"],
  },
  {
    name: "Growth",
    price: "Rp249 rb",
    note: "Untuk tempat les berkembang",
    featured: true,
    features: [
      "Hingga 200 murid",
      "Kelas tidak terbatas",
      "Semua fitur Starter",
      "Laporan lengkap",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    note: "Untuk banyak cabang",
    features: [
      "Murid tidak terbatas",
      "Multi-cabang",
      "Akses role lengkap",
      "Integrasi prioritas",
    ],
  },
];

const faqs = [
  "Apakah bisa digunakan untuk banyak cabang?",
  "Apakah data saya aman?",
  "Metode pembayaran apa saja yang tersedia?",
  "Apakah bisa trial terlebih dahulu?",
  "Bisa export data ke Excel?",
  "Apakah ada biaya setup?",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7fbff] text-[#07173c]">
      <section
        className="relative flex min-h-[92vh] items-center bg-cover bg-center bg-no-repeat px-6 py-6 sm:px-10 lg:px-16"
        style={{ backgroundImage: "url('/orbit-landingpage-bg.png')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/50 via-white/20 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_43%,rgba(255,255,255,0.78),transparent_29%)]" />

        <header className="absolute left-0 right-0 top-0 z-20 px-6 py-5 sm:px-10 lg:px-16">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <OrbitMark
                className="size-10 drop-shadow-[0_10px_24px_rgba(11,111,251,0.25)]"
                priority
              />
              <span>
                <span className="block text-base font-black text-[#07173c]">
                  Orbit
                </span>
                <span className="block text-[11px] font-semibold text-[#52658c]">
                  Sistem Manajemen Tempat Les
                </span>
              </span>
            </Link>

            <nav
              className="hidden items-center gap-8 text-sm font-bold text-[#223659] lg:flex"
              aria-label="Landing navigation"
            >
              {navItems.map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`}>
                  {item}
                </a>
              ))}
            </nav>

            <Link
              href="/auth/sign-in"
              className="hidden h-11 items-center rounded-lg border border-white/80 bg-white/78 px-5 text-sm font-bold text-[#253655] shadow-[0_14px_30px_rgba(47,82,140,0.12)] backdrop-blur-md transition hover:bg-white sm:inline-flex"
            >
              Masuk
            </Link>
          </div>
        </header>

        <div className="relative z-10 flex min-h-[calc(92vh-5rem)] w-full max-w-[740px] flex-col justify-center pt-20">
          <p className="mb-5 inline-flex w-fit rounded bg-white/64 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#1264f4] shadow-[0_12px_26px_rgba(47,82,140,0.12)] backdrop-blur-md">
            Orbit V1
          </p>

          <h1 className="max-w-[660px] text-[clamp(2.75rem,5.2vw,5.7rem)] font-black leading-[1.08] tracking-normal text-[#07173c] drop-shadow-[0_8px_26px_rgba(255,255,255,0.78)]">
            Kelola tempat les lebih mudah, semua dalam{" "}
            <span className="relative inline-block text-[#1264f4]">
              orbit.
              <span className="absolute -bottom-2 left-1 h-2 w-[96%] rounded-full bg-[#1264f4]/70" />
            </span>
          </h1>

          <p className="mt-7 max-w-[570px] text-[clamp(1.05rem,1.5vw,1.35rem)] font-medium leading-8 text-[#52658c] drop-shadow-[0_8px_24px_rgba(255,255,255,0.88)]">
            Orbit membantu owner dan admin mengelola murid, kelas, absensi,
            invoice, dan payment dalam satu dashboard yang cepat dipakai.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/auth/sign-up"
              className="inline-flex h-16 items-center justify-center gap-3 rounded-lg bg-[#1264f4] px-8 text-lg font-bold text-white shadow-[0_22px_45px_rgba(18,100,244,0.3)] transition hover:-translate-y-0.5 hover:bg-[#0d52d0] focus:outline-none focus:ring-4 focus:ring-[#1264f4]/25"
            >
              Sign up Tempat Les
              <ArrowRight className="size-6" aria-hidden="true" />
            </Link>
            <Link
              href="/auth/sign-in"
              className="inline-flex h-16 items-center justify-center rounded-lg border border-white/80 bg-white/82 px-8 text-lg font-bold text-[#253655] shadow-[0_18px_38px_rgba(47,82,140,0.16)] backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#1264f4]/15"
            >
              Lihat Demo
            </Link>
          </div>

          <div className="mt-12 grid max-w-[680px] gap-4 sm:grid-cols-3">
            {trustBadges.map((badge) => (
              <div
                key={badge.label}
                className="flex min-h-14 items-center gap-3 rounded-lg border border-white/80 bg-white/76 px-5 text-sm font-bold text-[#314361] shadow-[0_16px_32px_rgba(47,82,140,0.14)] backdrop-blur-md"
              >
                <badge.icon
                  className="size-6 shrink-0 text-[#1264f4]"
                  aria-hidden
                />
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-white px-6 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-sm font-bold text-[#52658c]">
            Dipercaya oleh tempat les robotics di Indonesia
          </p>
          <div className="mx-auto mt-8 flex max-w-3xl items-center justify-center rounded-lg border border-[#dbe8fb] bg-[#f8fbff] p-5 shadow-[0_18px_50px_rgba(55,100,170,0.08)]">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="flex h-20 w-36 items-center justify-center rounded-lg bg-white p-3 shadow-[0_12px_30px_rgba(47,82,140,0.1)]">
                <Image
                  src="/racer-robotic-logo.jpeg"
                  alt="Racer Robotic logo"
                  width={180}
                  height={84}
                  className="h-auto max-h-14 w-auto object-contain"
                  priority
                />
              </div>
              <div>
                <p className="text-lg font-black text-[#07173c]">
                  Racer Robotic Grand Depok City
                </p>
                <p className="mt-1 text-sm font-semibold text-[#607291]">
                  Robotic & Drone Coding Academy
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 rounded-lg border border-[#dbe8fb] bg-white p-4 shadow-[0_18px_50px_rgba(55,100,170,0.09)] md:grid-cols-4">
            {stats.map((item) => (
              <div key={item.label} className="flex items-center gap-4 p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#eaf3ff] text-[#1264f4]">
                  <item.icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-2xl font-black text-[#07173c]">
                    {item.value}
                  </span>
                  <span className="block text-sm font-semibold text-[#687996]">
                    {item.label}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="fitur" className="bg-white px-6 py-8 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-7xl gap-8">
          <FeaturePanel
            eyebrow="Data operasional"
            title="Semua data terorganisir dalam satu dashboard"
            body="Pantau murid, kelas, program, invoice, dan keuangan secara real-time dan akurat."
            bullets={["Data terpusat dan aman", "Update real-time", "Laporan otomatis"]}
            visual={<StudentTableMockup />}
          />

          <FeaturePanel
            eyebrow="Class calendar"
            title="Jadwal dan absensi lebih praktis"
            body="Kelola jadwal kelas dengan mudah dan pantau absensi murid secara digital."
            bullets={[
              "Penjadwalan fleksibel",
              "Absensi digital",
              "Rekap kehadiran otomatis",
            ]}
            visual={<CalendarMockup />}
            reverse
          />

          <FeaturePanel
            eyebrow="Billing"
            title="Invoice dan pembayaran tanpa ribet"
            body="Buat invoice otomatis dan lacak pembayaran dalam hitungan detik."
            bullets={[
              "Invoice otomatis",
              "Beragam metode pembayaran",
              "Riwayat pembayaran lengkap",
            ]}
            visual={<InvoiceMockup />}
          />
        </div>
      </section>

      <section className="bg-white px-6 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Alur kerja Orbit"
            title="Dari pendaftaran sampai laporan dalam satu alur"
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {workflow.map((step, index) => (
              <div key={step.label} className="relative">
                {index < workflow.length - 1 ? (
                  <div className="absolute left-[calc(50%+2rem)] top-10 hidden h-px w-[calc(100%-4rem)] bg-[#8ab8ff] lg:block" />
                ) : null}
                <div className="relative flex flex-col items-center gap-3 text-center">
                  <span className="flex size-20 items-center justify-center rounded-full border border-[#dbe8fb] bg-[#f3f8ff] text-[#1264f4] shadow-[0_18px_42px_rgba(55,100,170,0.1)]">
                    <step.icon className="size-8" aria-hidden />
                  </span>
                  <span className="text-sm font-black text-[#223659]">
                    {step.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="keuntungan"
        className="bg-white px-6 py-8 sm:px-10 lg:px-16"
      >
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <InfoCard
            title="Cocok untuk multi-cabang"
            body="Kelola banyak tempat les dalam satu akun dengan struktur organization yang jelas."
          >
            <OrganizationTreeMockup />
          </InfoCard>
          <InfoCard
            title="Terhubung dengan tools favorit"
            body="Integrasi yang memudahkan operasional tempat les Anda."
          >
            <IntegrationGrid />
          </InfoCard>
        </div>
      </section>

      <section className="bg-white px-6 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Kenapa pilih Orbit?" title="Dibuat untuk ritme tempat les" />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {reasons.map((reason) => (
              <article
                key={reason.title}
                className="rounded-lg border border-[#dbe8fb] bg-[#f8fbff] p-6 shadow-[0_16px_42px_rgba(55,100,170,0.08)]"
              >
                <span className="flex size-12 items-center justify-center rounded-lg bg-[#eaf3ff] text-[#1264f4]">
                  <reason.icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-black text-[#07173c]">
                  {reason.title}
                </h3>
                <p className="mt-2 text-sm font-medium leading-6 text-[#607291]">
                  {reason.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="testimoni" className="bg-white px-6 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Apa kata mereka" title="Dipakai oleh owner dan admin" />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {testimonials.map((item) => (
              <article
                key={item.name}
                className="rounded-lg border border-[#dbe8fb] bg-white p-6 shadow-[0_16px_42px_rgba(55,100,170,0.09)]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-full bg-[#eaf3ff] text-[#1264f4]">
                    <Users className="size-6" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-black text-[#07173c]">
                      {item.name}
                    </span>
                    <span className="block text-xs font-bold text-[#607291]">
                      {item.role}
                    </span>
                  </span>
                </div>
                <div className="mt-4 flex gap-1 text-[#f8b02b]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={`${item.name}-${index}`}
                      className="size-4 fill-current"
                      aria-hidden
                    />
                  ))}
                </div>
                <p className="mt-4 text-sm font-medium leading-6 text-[#52658c]">
                  {item.quote}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="harga" className="bg-white px-6 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Harga"
            title="Pilih paket yang sesuai kebutuhan Anda"
          />
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`relative rounded-lg border p-7 shadow-[0_18px_48px_rgba(55,100,170,0.1)] ${
                  plan.featured
                    ? "border-[#1264f4] bg-white"
                    : "border-[#dbe8fb] bg-[#f8fbff]"
                }`}
              >
                {plan.featured ? (
                  <span className="absolute right-6 top-6 rounded bg-[#1264f4] px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-white">
                    Pilihan favorit
                  </span>
                ) : null}
                <h3 className="text-2xl font-black text-[#07173c]">
                  {plan.name}
                </h3>
                <p className="mt-2 text-sm font-semibold text-[#607291]">
                  {plan.note}
                </p>
                <p className="mt-7 text-4xl font-black text-[#1264f4]">
                  {plan.price}
                  {plan.price !== "Custom" ? (
                    <span className="text-sm font-bold text-[#607291]">
                      {" "}
                      /bulan
                    </span>
                  ) : null}
                </p>
                <ul className="mt-8 grid gap-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-3 text-sm font-bold text-[#314361]"
                    >
                      <CheckCircle2
                        className="size-5 shrink-0 text-[#1daa67]"
                        aria-hidden
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-white px-6 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="FAQ"
            title="Pertanyaan yang sering diajukan"
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {faqs.map((question) => (
              <button
                key={question}
                className="flex min-h-14 items-center justify-between rounded-lg border border-[#dbe8fb] bg-[#f8fbff] px-5 text-left text-sm font-black text-[#223659] shadow-[0_12px_32px_rgba(55,100,170,0.06)]"
              >
                {question}
                <ChevronDown className="size-5 text-[#1264f4]" aria-hidden />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 pb-12 pt-4 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-lg bg-[#06183f] text-white shadow-[0_24px_70px_rgba(6,24,63,0.22)] lg:grid-cols-[1fr_0.75fr]">
          <div className="p-8 sm:p-12">
            <p className="mb-4 inline-flex rounded bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#8fc0ff]">
              Siap mulai?
            </p>
            <h2 className="max-w-2xl text-3xl font-black leading-tight tracking-normal sm:text-5xl">
              Siap membawa tempat les Anda masuk ke{" "}
              <span className="text-[#5aa3ff]">orbit?</span>
            </h2>
            <p className="mt-5 max-w-xl text-base font-medium leading-7 text-[#c7d8ff]">
              Mulai kelola tempat les lebih mudah, cepat, dan efisien bersama
              Orbit.
            </p>
            <Link
              href="/auth/sign-up"
              className="mt-8 inline-flex h-14 items-center justify-center gap-3 rounded-lg bg-white px-7 text-base font-black text-[#1264f4] transition hover:-translate-y-0.5 hover:bg-[#eaf3ff]"
            >
              Mulai Sekarang
              <ArrowRight className="size-5" aria-hidden />
            </Link>
          </div>
          <div className="relative min-h-64 bg-[radial-gradient(circle_at_50%_30%,rgba(90,163,255,0.7),transparent_32%),linear-gradient(135deg,rgba(18,100,244,0.2),rgba(255,255,255,0.02))]">
            <div className="absolute left-1/2 top-1/2 flex size-36 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white shadow-[0_24px_70px_rgba(18,100,244,0.32)] backdrop-blur-md">
              <OrbitMark className="size-24" priority />
            </div>
            <Sparkles className="absolute right-16 top-14 size-8 text-[#f8c85a]" />
            <Cloud className="absolute bottom-14 left-16 size-10 text-white/55" />
          </div>
        </div>
      </section>
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-black uppercase tracking-[0.14em] text-[#1264f4]">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-black tracking-normal text-[#07173c] sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}

function FeaturePanel({
  eyebrow,
  title,
  body,
  bullets,
  visual,
  reverse = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  visual: ReactNode;
  reverse?: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-[#dbe8fb] bg-[#f8fbff] shadow-[0_18px_50px_rgba(55,100,170,0.09)]">
      <div
        className={`grid items-center gap-8 p-7 sm:p-10 lg:grid-cols-2 ${
          reverse ? "lg:[&>*:first-child]:order-2" : ""
        }`}
      >
        <div>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-[#1264f4]">
            {eyebrow}
          </p>
          <h2 className="mt-4 max-w-lg text-3xl font-black leading-tight tracking-normal text-[#07173c]">
            {title}
          </h2>
          <p className="mt-4 max-w-lg text-base font-medium leading-7 text-[#607291]">
            {body}
          </p>
          <ul className="mt-6 grid gap-3">
            {bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-center gap-3 text-sm font-bold text-[#314361]"
              >
                <CheckCircle2
                  className="size-5 shrink-0 text-[#1264f4]"
                  aria-hidden
                />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
        {visual}
      </div>
    </article>
  );
}

function StudentTableMockup() {
  const rows = [
    ["Ahmad Firhan", "Robotics Level 1", "Robotics A", "Aktif"],
    ["Siti Alya", "Coding Basic", "Coding B", "Aktif"],
    ["Dika Pratama", "Math Advanced", "Math A", "Aktif"],
    ["Rina Maria", "Robotics Level 2", "Robotics B", "Aktif"],
  ];

  return (
    <div className="rounded-lg border border-[#dbe8fb] bg-white p-5 shadow-[0_20px_50px_rgba(55,100,170,0.12)]">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-black text-[#07173c]">
          <OrbitMark className="size-6" priority />
          Murid
        </span>
        <span className="rounded bg-[#eaf3ff] px-3 py-1 text-xs font-black text-[#1264f4]">
          Live
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border border-[#e2ecfb]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f3f8ff] text-xs font-black uppercase text-[#607291]">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Program</th>
              <th className="px-4 py-3">Kelas</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]} className="border-t border-[#e2ecfb]">
                {row.map((cell, index) => (
                  <td
                    key={`${row[0]}-${cell}`}
                    className={`px-4 py-3 ${
                      index === 3 ? "font-black text-[#1daa67]" : "text-[#314361]"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CalendarMockup() {
  const days = Array.from({ length: 31 }, (_, index) => index + 1);

  return (
    <div className="mx-auto max-w-md rounded-lg border border-[#dbe8fb] bg-white p-5 shadow-[0_20px_50px_rgba(55,100,170,0.12)]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-black text-[#07173c]">Mei 2024</span>
        <CalendarCheck className="size-5 text-[#1264f4]" aria-hidden />
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-[#607291]">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
        {days.map((day) => (
          <span
            key={day}
            className={`rounded py-2 ${
              day === 15
                ? "bg-[#1264f4] text-white"
                : day === 9 || day === 23
                  ? "bg-[#eaf3ff] text-[#1264f4]"
                  : "text-[#8a9abb]"
            }`}
          >
            {day}
          </span>
        ))}
      </div>
      <div className="mt-5 rounded-lg bg-[#f3f8ff] p-4 text-sm font-bold text-[#314361]">
        Coding Basic, 16:00 - 17:30
      </div>
    </div>
  );
}

function InvoiceMockup() {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_0.8fr]">
      <div className="rounded-lg border border-[#dbe8fb] bg-white p-5 shadow-[0_20px_50px_rgba(55,100,170,0.12)]">
        <p className="text-xs font-black uppercase text-[#607291]">
          Invoice #INV-2024-0012
        </p>
        <div className="mt-4 flex items-center justify-between border-b border-[#e2ecfb] pb-4">
          <span className="font-black text-[#07173c]">Siti Alyah</span>
          <span className="font-black text-[#1264f4]">Rp480.000</span>
        </div>
        <div className="mt-4 grid gap-3 text-sm font-semibold text-[#607291]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>Rp480.000</span>
          </div>
          <div className="flex justify-between">
            <span>Diskon</span>
            <span>-Rp40.000</span>
          </div>
          <div className="flex justify-between font-black text-[#07173c]">
            <span>Total</span>
            <span>Rp440.000</span>
          </div>
        </div>
        <span className="mt-5 inline-flex rounded bg-[#e4faef] px-3 py-1 text-xs font-black text-[#1c8f56]">
          Lunas
        </span>
      </div>
      <div className="rounded-lg border border-[#dbe8fb] bg-white p-5 shadow-[0_20px_50px_rgba(55,100,170,0.12)]">
        <p className="mb-4 text-sm font-black text-[#07173c]">
          Metode Pembayaran
        </p>
        {["Bank Transfer", "Midtrans", "Xendit", "E-Wallet"].map((item) => (
          <div key={item} className="mb-3 flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded bg-[#eaf3ff] text-[#1264f4]">
              <CreditCard className="size-4" aria-hidden />
            </span>
            <span className="text-sm font-bold text-[#314361]">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoCard({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-lg border border-[#dbe8fb] bg-[#f8fbff] p-7 shadow-[0_18px_50px_rgba(55,100,170,0.09)]">
      <h2 className="text-2xl font-black tracking-normal text-[#07173c]">
        {title}
      </h2>
      <p className="mt-2 text-sm font-medium leading-6 text-[#607291]">{body}</p>
      <div className="mt-7">{children}</div>
    </article>
  );
}

function OrganizationTreeMockup() {
  return (
    <div className="rounded-lg border border-[#dbe8fb] bg-white p-5">
      <div className="mx-auto flex w-fit items-center gap-2 rounded-lg border border-[#dbe8fb] bg-[#f8fbff] px-5 py-3 text-sm font-black text-[#07173c]">
        <Building2 className="size-5 text-[#1264f4]" aria-hidden />
        Organization
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs font-black text-[#314361]">
        {["Owner", "Admin", "Teacher"].map((role) => (
          <div key={role} className="rounded-lg bg-[#f3f8ff] p-3">
            <Users className="mx-auto mb-2 size-5 text-[#1264f4]" aria-hidden />
            {role}
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2 text-center text-[11px] font-bold text-[#607291]">
        {["Program", "Package", "Kelas", "Murid", "Payment"].map((item) => (
          <div key={item} className="rounded bg-[#f8fbff] px-2 py-3">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function IntegrationGrid() {
  const integrations = [
    ["Google Calendar", CalendarCheck],
    ["WhatsApp", MessageCircle],
    ["Gmail / Email", Mail],
    ["Midtrans", CreditCard],
    ["Xendit", WalletCards],
    ["Zoom", Video],
    ["Google Meet", Video],
    ["Microsoft Excel", Table2],
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {integrations.map(([name, Icon]) => (
        <div
          key={String(name)}
          className="flex items-center gap-3 rounded-lg border border-[#dbe8fb] bg-white px-4 py-3 text-sm font-black text-[#314361]"
        >
          <Icon className="size-5 text-[#1264f4]" aria-hidden />
          {String(name)}
        </div>
      ))}
    </div>
  );
}
