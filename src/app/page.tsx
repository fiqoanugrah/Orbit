import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  ReceiptText,
  School,
  ShieldCheck,
  Users,
} from "lucide-react";

import { signOut } from "@/app/auth/actions";
import { OrbitMark } from "@/components/orbit-mark";
import { getCurrentUser } from "@/lib/auth";
import { getOrganizationsForUser } from "@/lib/organization";

export const dynamic = "force-dynamic";

const highlights = [
  {
    title: "Akademik dan admin satu alur",
    body: "Parent, murid, program, paket, kelas, enrollment, invoice, dan payment tersambung rapi.",
    icon: ClipboardList,
  },
  {
    title: "Siap untuk banyak tempat les",
    body: "Setiap data masuk ke organization, jadi fondasinya sudah siap untuk multi-cabang dan SaaS.",
    icon: School,
  },
  {
    title: "Billing tidak mengganggu kelas",
    body: "Enrollment tetap aktif walaupun paket berubah. Invoice lama tidak perlu diubah.",
    icon: ReceiptText,
  },
];

const productFlow = [
  "Buat tempat les",
  "Atur periode akademik",
  "Buat program dan paket",
  "Kelola kelas",
  "Daftarkan murid",
  "Terbitkan invoice",
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  const organizations = user ? await getOrganizationsForUser(user.id) : [];
  const primaryAuthenticatedHref =
    organizations.length > 0 ? "/app/dashboard" : "/onboarding/create-organization";

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#172033]">
      <header className="border-b border-[#dfe6ef] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <OrbitMark className="size-10" priority />
            <span>
              <span className="block text-lg font-semibold">Orbit</span>
              <span className="block text-xs text-[#6b7890]">
                Sistem Manajemen Tempat Les
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Landing actions">
            {user ? (
              <>
                <div className="hidden h-10 max-w-56 items-center gap-2 rounded-md border border-[#d7e0ea] bg-[#fbfcfe] px-3 sm:flex">
                  <ShieldCheck className="size-4 shrink-0 text-[#16834a]" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-[#172033]">
                      Authenticated
                    </span>
                    <span className="block truncate text-xs text-[#6b7890]">
                      {user.email}
                    </span>
                  </span>
                </div>
                <form action={signOut} className="hidden sm:block">
                  <button className="h-10 rounded-md px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]">
                    Keluar
                  </button>
                </form>
                <Link
                  href={primaryAuthenticatedHref}
                  className="flex h-10 items-center gap-2 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9]"
                >
                  {organizations.length > 0 ? "Dashboard" : "Buat Organization"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/sign-in"
                  className="hidden h-10 items-center rounded-md px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9] sm:flex"
                >
                  Masuk
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="flex h-10 items-center gap-2 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9]"
                >
                  Sign up
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:px-8 lg:grid-cols-[1fr_0.9fr] lg:py-16">
        <div className="flex flex-col justify-center">
          <p className="mb-4 text-sm font-semibold uppercase text-[#f5a623]">
            Orbit v1
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-[#172033] md:text-6xl">
            Tempat les lebih rapi dari pendaftaran sampai pembayaran.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#536174]">
            Orbit membantu owner dan admin mengelola murid, kelas, absensi,
            invoice, dan payment dalam satu dashboard yang cepat dipakai.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={user ? primaryAuthenticatedHref : "/auth/sign-up"}
              className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9]"
            >
              {user
                ? organizations.length > 0
                  ? "Buka Dashboard"
                  : "Buat Organization"
                : "Sign up Tempat Les"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href={user ? "/auth/sign-in" : "/auth/sign-in"}
              className="flex h-11 items-center justify-center rounded-md border border-[#d7e0ea] bg-white px-4 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
            >
              {user ? "Pilih Organization" : "Masuk"}
            </Link>
          </div>
        </div>

        <div className="rounded-md border border-[#dfe6ef] bg-white shadow-sm">
          <div className="border-b border-[#e6edf5] px-5 py-4">
            <p className="text-sm font-semibold text-[#172033]">
              Operasional Hari Ini
            </p>
            <p className="text-sm text-[#6b7890]">
              Preview dashboard setelah organization dibuat.
            </p>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {[
              ["Active Students", "128", Users],
              ["Today Classes", "9", CalendarCheck],
              ["Monthly Revenue", "Rp42,7 jt", CreditCard],
              ["Outstanding", "Rp8,9 jt", ReceiptText],
            ].map(([label, value, Icon]) => (
              <div
                key={String(label)}
                className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4"
              >
                <Icon className="mb-5 size-5 text-[#0b6ffb]" aria-hidden />
                <p className="text-2xl font-semibold">{String(value)}</p>
                <p className="mt-1 text-sm text-[#6b7890]">{String(label)}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-[#e6edf5] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <LayoutDashboard className="size-4 text-[#0b6ffb]" aria-hidden />
              Flow Produk
            </div>
            <div className="mt-4 grid gap-2">
              {productFlow.map((step) => (
                <div
                  key={step}
                  className="flex items-center gap-3 rounded-md bg-[#f6f8fb] px-3 py-2 text-sm"
                >
                  <CheckCircle2
                    className="size-4 text-[#16834a]"
                    aria-hidden
                  />
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-12 md:px-8 lg:grid-cols-3">
        {highlights.map((item) => (
          <article
            key={item.title}
            className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm"
          >
            <item.icon className="mb-5 size-5 text-[#0b6ffb]" aria-hidden />
            <h2 className="text-base font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#536174]">
              {item.body}
            </p>
          </article>
        ))}
      </section>

      <section className="border-t border-[#dfe6ef] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <p className="text-sm font-semibold text-[#172033]">
              Mulai dari organization dulu.
            </p>
            <p className="mt-1 text-sm text-[#6b7890]">
              Setelah tempat les dibuat, dashboard langsung memakai data awal
              dari database.
            </p>
          </div>
          <Link
            href={user ? primaryAuthenticatedHref : "/auth/sign-up"}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9]"
          >
            {user ? "Lanjut Setup" : "Setup Orbit"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
