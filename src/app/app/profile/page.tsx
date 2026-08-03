import Image from "next/image";
import {
  Building2,
  CheckCircle2,
  ImagePlus,
  Trash2,
} from "lucide-react";

import { AppPageShell } from "@/app/app/app-page-shell";
import { deleteOrganization } from "@/app/app/actions";
import {
  switchOrganization,
  updateOrganizationProfile,
} from "@/app/app/actions";
import { requireWorkspaceContext } from "@/lib/organization";
import { hasOrganizationPermission } from "@/lib/roles";
import { PendingButton } from "@/components/pending-button";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string; updated?: string }>;
}) {
  const params = await searchParams;
  const {
    organization: activeOrganization,
    membership: activeMembership,
    organizations,
  } = await requireWorkspaceContext("/app/profile");
  const canManageProfile = hasOrganizationPermission(
    activeMembership,
    "organization.profile.manage",
  );

  return (
    <AppPageShell
      activePath="/app/profile"
      activeRole={activeMembership.customRole?.name ?? activeMembership.role}
      eyebrow="Profile"
      organization={activeOrganization}
      organizations={organizations}
      title={activeOrganization.name}
    >
      <div className="mx-auto max-w-6xl">

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

            {params.deleted ? (
              <div className="mt-5 flex items-center gap-2 rounded-md bg-[#e7f8ef] px-3 py-2 text-sm font-semibold text-[#16834a]">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Organization berhasil dihapus.
              </div>
            ) : null}

            {params.error === "delete-confirmation" ? (
              <div className="mt-5 rounded-md bg-[#ffecec] px-3 py-2 text-sm font-medium text-[#c73535]">
                Nama organization yang diketik belum sama.
              </div>
            ) : null}

            {params.error === "permission" ? (
              <div className="mt-5 rounded-md bg-[#ffecec] px-3 py-2 text-sm font-medium text-[#c73535]">
                Akun kamu belum bisa mengelola profile organization ini.
              </div>
            ) : null}

            {params.error === "photo" ? (
              <div className="mt-5 rounded-md bg-[#ffecec] px-3 py-2 text-sm font-medium text-[#c73535]">
                Foto / logo harus image dan maksimal 5 MB.
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
                    disabled={!canManageProfile}
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#eaf2ff] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#075bc9] disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
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
                  disabled={!canManageProfile}
                  className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
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
                    disabled={!canManageProfile}
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Email</span>
                  <input
                    name="email"
                    type="email"
                    defaultValue={activeOrganization.email ?? ""}
                    disabled={!canManageProfile}
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Timezone</span>
                  <select
                    name="timezone"
                    defaultValue={activeOrganization.timezone}
                    disabled={!canManageProfile}
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
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
                  disabled={!canManageProfile}
                  className="resize-none rounded-md border border-[#d7e0ea] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </label>

              <PendingButton
                disabled={!canManageProfile}
                className="flex h-11 items-center justify-center rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:bg-[#b9c7d8]"
                pendingChildren="Menyimpan profile..."
              >
                Simpan Profile
              </PendingButton>
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
                <article
                  key={organization.id}
                  className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3"
                >
                  <form action={switchOrganization}>
                    <input
                      type="hidden"
                      name="organizationId"
                      value={organization.id}
                    />
                    <input type="hidden" name="redirectTo" value="/app/profile" />
                    <PendingButton
                      className="flex w-full items-center gap-3 rounded-md text-left transition hover:text-[#075bc9] disabled:cursor-wait disabled:opacity-70"
                      pendingChildren="Mengganti organization..."
                    >
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
                    </PendingButton>
                  </form>

                  {organization.role === "OWNER" ? (
                    <details className="mt-3 border-t border-[#e6edf5] pt-3">
                      <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#c73535]">
                        <Trash2 className="size-3.5" aria-hidden="true" />
                        Delete organization
                      </summary>
                      <form action={deleteOrganization} className="mt-3 grid gap-2">
                        <input
                          type="hidden"
                          name="organizationId"
                          value={organization.id}
                        />
                        <input
                          type="hidden"
                          name="redirectTo"
                          value="/app/profile"
                        />
                        <p className="text-xs leading-5 text-[#6b7890]">
                          Ketik nama organization untuk menghapus semua data di
                          workspace ini.
                        </p>
                        <input
                          name="confirmation"
                          placeholder={organization.name}
                          className="h-10 rounded-md border border-[#f4c6c6] bg-white px-3 text-sm outline-none focus:border-[#c73535] focus:ring-2 focus:ring-[#c73535]/15"
                        />
                        <PendingButton
                          className="flex h-10 items-center justify-center rounded-md bg-[#c73535] px-3 text-sm font-semibold text-white transition hover:bg-[#a92c2c] disabled:cursor-wait disabled:bg-[#d87878]"
                          pendingChildren="Deleting..."
                        >
                          Delete
                        </PendingButton>
                      </form>
                    </details>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppPageShell>
  );
}
