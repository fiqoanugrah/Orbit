import Link from "next/link";
import { ArrowLeft, CheckCircle2, UserCircle } from "lucide-react";

import { createOrganization } from "@/app/onboarding/actions";
import { CreateOrganizationSubmitButton } from "@/app/onboarding/create-organization/submit-button";
import { OrbitMark } from "@/components/orbit-mark";
import { requireCurrentUser } from "@/lib/auth";

export default async function CreateOrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const user = await requireCurrentUser("/onboarding/create-organization");

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#172033]">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-4 py-8 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex flex-col justify-between rounded-md border border-[#dfe6ef] bg-white p-6 shadow-sm">
          <div>
            <Link
              href="/"
              className="mb-8 inline-flex h-10 items-center gap-2 rounded-md border border-[#d7e0ea] px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Kembali
            </Link>
            <OrbitMark className="size-12" priority />
            <h1 className="mt-5 text-3xl font-semibold leading-tight">
              Buat organization tempat les.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#536174]">
              Organization adalah ruang kerja untuk semua data Orbit: murid,
              program, kelas, invoice, payment, dan laporan.
            </p>
          </div>

          <div className="mt-8 space-y-3 border-t border-[#e6edf5] pt-5">
            {[
              "Dashboard langsung aktif setelah submit",
              "Data organization tersimpan ke Supabase",
              "Struktur database sudah siap multi-tenant",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <CheckCircle2
                  className="size-4 text-[#16834a]"
                  aria-hidden
                />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center">
          <form
            action={createOrganization}
            className="w-full rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm"
          >
            <div className="border-b border-[#e6edf5] pb-5">
              <p className="text-sm font-semibold uppercase text-[#f5a623]">
                Setup awal
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Data Tempat Les
              </h2>
              <p className="mt-2 text-sm text-[#6b7890]">
                Akun kamu akan otomatis menjadi owner organization baru ini.
                Detail lain bisa dilengkapi dari profile.
              </p>
            </div>

            <div className="grid gap-4 py-5">
              <div className="flex items-center gap-3 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3">
                <div className="grid size-11 place-items-center rounded-md bg-[#eaf2ff] text-[#075bc9]">
                  <UserCircle className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-[#6b7890]">
                    {user.email}
                  </p>
                </div>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Nama tempat les</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  placeholder="Orbit Robotics Center"
                  className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15"
                />
                {params.error === "name" ? (
                  <span className="text-xs font-medium text-[#c73535]">
                    Nama tempat les minimal 2 karakter.
                  </span>
                ) : null}
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Nomor WhatsApp</span>
                  <input
                    name="phone"
                    placeholder="0812-0000-0000"
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Email</span>
                  <input
                    name="email"
                    type="email"
                    placeholder="admin@tempatles.com"
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Timezone</span>
                  <select
                    name="timezone"
                    defaultValue="Asia/Jakarta"
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15"
                  >
                    <option value="Asia/Jakarta">Asia/Jakarta</option>
                    <option value="Asia/Makassar">Asia/Makassar</option>
                    <option value="Asia/Jayapura">Asia/Jayapura</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Foto / logo</span>
                  <input
                    name="photo"
                    type="file"
                    accept="image/*"
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#eaf2ff] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#075bc9]"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Alamat</span>
                <textarea
                  name="address"
                  rows={4}
                  placeholder="Jl. Contoh No. 10, Jakarta"
                  className="resize-none rounded-md border border-[#d7e0ea] bg-white px-3 py-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15"
                />
              </label>
            </div>

            <CreateOrganizationSubmitButton />
          </form>
        </section>
      </div>
    </main>
  );
}
