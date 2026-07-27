import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";

import { createOrganizationRole } from "@/app/app/roles/actions";
import {
  requireActiveMembership,
  requireActiveOrganization,
} from "@/lib/organization";
import {
  canManageOrganizationRoles,
  organizationPermissions,
} from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const params = await searchParams;
  const organization = await requireActiveOrganization();
  const membership = await requireActiveMembership(organization.id);
  const canManageRoles = canManageOrganizationRoles(membership.role);

  const roles = await prisma.organizationRole.findMany({
    where: { organizationId: organization.id },
    include: {
      _count: {
        select: { memberships: true },
      },
    },
    orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
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
              Roles
            </p>
            <h1 className="mt-1 text-3xl font-semibold">
              {organization.name}
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

        <section className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <ShieldCheck className="mb-4 size-5 text-[#0b6ffb]" />
            <p className="text-sm font-semibold">Application Account</p>
            <p className="mt-2 text-sm leading-6 text-[#6b7890]">
              Akun Google kamu dipakai untuk login ke Orbit dan bisa punya
              beberapa organization.
            </p>
          </div>
          <div className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <Users className="mb-4 size-5 text-[#16834a]" />
            <p className="text-sm font-semibold">Organization Membership</p>
            <p className="mt-2 text-sm leading-6 text-[#6b7890]">
              Setiap tempat les punya membership sendiri, jadi role kamu bisa
              beda antar organization.
            </p>
          </div>
          <div className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <LockKeyhole className="mb-4 size-5 text-[#9c6400]" />
            <p className="text-sm font-semibold">Custom Role</p>
            <p className="mt-2 text-sm leading-6 text-[#6b7890]">
              Owner/Admin bisa membuat role baru sesuai cara kerja tempat les.
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="border-b border-[#e6edf5] pb-5">
              <h2 className="text-lg font-semibold">Buat Custom Role</h2>
              <p className="mt-1 text-sm text-[#6b7890]">
                Role ini hanya berlaku di organization aktif.
              </p>
            </div>

            {params.created ? (
              <div className="mt-5 flex items-center gap-2 rounded-md bg-[#e7f8ef] px-3 py-2 text-sm font-semibold text-[#16834a]">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Role berhasil dibuat atau diperbarui.
              </div>
            ) : null}

            {params.error ? (
              <div className="mt-5 rounded-md bg-[#ffecec] px-3 py-2 text-sm font-medium text-[#c73535]">
                {params.error === "permission"
                  ? "Akun kamu belum bisa mengelola role di organization ini."
                  : "Nama role minimal 2 karakter."}
              </div>
            ) : null}

            <form action={createOrganizationRole} className="grid gap-4 pt-5">
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Nama role</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  disabled={!canManageRoles}
                  placeholder="Finance Admin"
                  className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Deskripsi</span>
                <textarea
                  name="description"
                  rows={3}
                  disabled={!canManageRoles}
                  placeholder="Mengelola invoice, payment, dan laporan finance."
                  className="resize-none rounded-md border border-[#d7e0ea] bg-white px-3 py-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </label>

              <fieldset className="grid gap-3">
                <legend className="text-sm font-semibold">Permissions</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {organizationPermissions.map((permission) => (
                    <label
                      key={permission.key}
                      className="flex min-h-11 items-center gap-3 rounded-md border border-[#e6edf5] bg-[#fbfcfe] px-3 py-2 text-sm"
                    >
                      <input
                        name="permissions"
                        type="checkbox"
                        value={permission.key}
                        disabled={!canManageRoles}
                        className="size-4 accent-[#0b6ffb]"
                      />
                      {permission.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <button
                disabled={!canManageRoles}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:bg-[#b9c7d8]"
              >
                <Plus className="size-4" aria-hidden="true" />
                Simpan Role
              </button>
            </form>
          </section>

          <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="border-b border-[#e6edf5] pb-5">
              <h2 className="text-lg font-semibold">Roles Aktif</h2>
              <p className="mt-1 text-sm text-[#6b7890]">
                Daftar role yang tersedia di organization ini.
              </p>
            </div>

            <div className="grid gap-3 pt-5">
              {roles.map((role) => (
                <article
                  key={role.id}
                  className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{role.name}</h3>
                        <span className="rounded-sm bg-white px-2 py-1 text-xs font-semibold text-[#6b7890]">
                          {role.isSystem ? "System" : "Custom"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#6b7890]">
                        {role.description || "Belum ada deskripsi."}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                      {role._count.memberships} member
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {role.permissions.length > 0 ? (
                      role.permissions.map((permission) => (
                        <span
                          key={permission}
                          className="rounded-sm border border-[#d7e0ea] bg-white px-2 py-1 text-xs font-medium text-[#536174]"
                        >
                          {permission}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-[#9aa7b8]">
                        Belum ada permission.
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
