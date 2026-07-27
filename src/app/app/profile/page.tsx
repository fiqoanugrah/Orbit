import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ImagePlus,
  Plus,
} from "lucide-react";

import {
  switchOrganization,
  updateOrganizationProfile,
} from "@/app/app/actions";
import { requireActiveOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const params = await searchParams;
  const activeOrganization = await requireActiveOrganization();
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#172033]">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/app/dashboard"
              className="mb-4 inline-flex h-10 items-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Dashboard
            </Link>
            <p className="text-xs font-semibold uppercase text-[#f5a623]">
              Profile
            </p>
            <h1 className="mt-1 text-3xl font-semibold">
              {activeOrganization.name}
            </h1>
          </div>
          <Link
            href="/onboarding/create-organization"
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9]"
          >
            <Plus className="size-4" aria-hidden="true" />
            Organization Baru
          </Link>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="border-b border-[#e6edf5] pb-5">
              <h2 className="text-lg font-semibold">Organization Profile</h2>
              <p className="mt-1 text-sm text-[#6b7890]">
                Data ini akan dipakai untuk identitas tempat les di dashboard,
                invoice, dan komunikasi.
              </p>
            </div>

            {params.updated ? (
              <div className="mt-5 flex items-center gap-2 rounded-md bg-[#e7f8ef] px-3 py-2 text-sm font-semibold text-[#16834a]">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Profile berhasil diperbarui.
              </div>
            ) : null}

            <form
              action={updateOrganizationProfile}
              className="grid gap-4 pt-5"
            >
              <div className="flex items-center gap-4 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3">
                <div className="relative grid size-20 place-items-center overflow-hidden rounded-md bg-[#eaf2ff] text-[#075bc9]">
                  {activeOrganization.photoUrl ? (
                    <Image
                      src={activeOrganization.photoUrl}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <Building2 className="size-7" aria-hidden="true" />
                  )}
                </div>
                <label className="grid flex-1 gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <ImagePlus className="size-4" aria-hidden="true" />
                    Foto / logo
                  </span>
                  <input
                    name="photo"
                    type="file"
                    accept="image/*"
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#eaf2ff] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#075bc9]"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Nama tempat les</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  defaultValue={activeOrganization.name}
                  className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15"
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
                    defaultValue={activeOrganization.phone ?? ""}
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Email</span>
                  <input
                    name="email"
                    type="email"
                    defaultValue={activeOrganization.email ?? ""}
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Timezone</span>
                  <select
                    name="timezone"
                    defaultValue={activeOrganization.timezone}
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15"
                  >
                    <option value="Asia/Jakarta">Asia/Jakarta</option>
                    <option value="Asia/Makassar">Asia/Makassar</option>
                    <option value="Asia/Jayapura">Asia/Jayapura</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Slug</span>
                  <input
                    value={activeOrganization.slug}
                    readOnly
                    className="h-11 rounded-md border border-[#d7e0ea] bg-[#f6f8fb] px-3 text-sm text-[#6b7890] outline-none"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Alamat</span>
                <textarea
                  name="address"
                  rows={4}
                  defaultValue={activeOrganization.address ?? ""}
                  className="resize-none rounded-md border border-[#d7e0ea] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15"
                />
              </label>

              <button className="flex h-11 items-center justify-center rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9]">
                Simpan Profile
              </button>
            </form>
          </section>

          <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="border-b border-[#e6edf5] pb-5">
              <h2 className="text-lg font-semibold">Organizations</h2>
              <p className="mt-1 text-sm text-[#6b7890]">
                Orbit bisa menyimpan lebih dari satu tempat les. Pilih salah
                satu sebagai workspace aktif.
              </p>
            </div>

            <div className="grid gap-3 pt-5">
              {organizations.map((organization) => (
                <form key={organization.id} action={switchOrganization}>
                  <input
                    type="hidden"
                    name="organizationId"
                    value={organization.id}
                  />
                  <button className="flex w-full items-center gap-3 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3 text-left transition hover:border-[#0b6ffb] hover:bg-[#eef5ff]">
                    <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-md bg-[#eaf2ff] text-[#075bc9]">
                      {organization.photoUrl ? (
                        <Image
                          src={organization.photoUrl}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      ) : (
                        <Building2 className="size-5" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {organization.name}
                      </span>
                      <span className="block truncate text-xs text-[#6b7890]">
                        {organization.id === activeOrganization.id
                          ? "Aktif sekarang"
                          : organization.address || organization.timezone}
                      </span>
                    </span>
                  </button>
                </form>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
