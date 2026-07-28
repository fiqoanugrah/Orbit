import {
  CheckCircle2,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";

import { AppPageShell } from "@/app/app/app-page-shell";
import {
  createParent,
  deleteParent,
  updateParent,
} from "@/app/app/parents/actions";
import { ListSearch } from "@/components/list-search";
import { PendingButton } from "@/components/pending-button";
import {
  requireWorkspaceContext,
} from "@/lib/organization";
import { normalizeSearchParam, pageListLimit } from "@/lib/performance";
import { hasOrganizationPermission } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusMessages = {
  created: "Parent berhasil ditambahkan.",
  updated: "Parent berhasil diperbarui.",
  deleted: "Parent berhasil dihapus.",
} as const;

const errorMessages = {
  permission: "Akun kamu belum bisa mengelola parent di organization ini.",
  name: "Nama parent minimal 2 karakter.",
  parent: "Parent tidak ditemukan.",
  "parent-has-students": "Parent masih punya student, pindahkan/hapus student dulu.",
} as const;

type ParentsSearchParams = {
  created?: string;
  deleted?: string;
  error?: keyof typeof errorMessages;
  q?: string;
  updated?: string;
};

function statusKey(params: ParentsSearchParams) {
  return (["created", "updated", "deleted"] as const).find((key) => params[key]);
}

export default async function ParentsPage({
  searchParams,
}: {
  searchParams: Promise<ParentsSearchParams>;
}) {
  const params = await searchParams;
  const { organization, membership, organizations } =
    await requireWorkspaceContext("/app/parents");
  const canManageParents = hasOrganizationPermission(membership, "students.manage");
  const activeStatus = statusKey(params);
  const query = normalizeSearchParam(params.q);

  const parents = await prisma.parent.findMany({
    where: {
      organizationId: organization.id,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { address: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { students: true } } },
    orderBy: { createdAt: "desc" },
    take: pageListLimit,
  });

  return (
    <AppPageShell
      activePath="/app/parents"
      activeRole={membership.customRole?.name ?? membership.role}
      eyebrow="Parents"
      organization={organization}
      organizations={organizations}
      title="Parent Data"
    >
      <div className="mx-auto max-w-6xl">

        {activeStatus ? (
          <div className="mb-5 flex items-center gap-2 rounded-md bg-[#e7f8ef] px-3 py-2 text-sm font-semibold text-[#16834a]">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {statusMessages[activeStatus]}
          </div>
        ) : null}

        {params.error ? (
          <div className="mb-5 rounded-md bg-[#ffecec] px-3 py-2 text-sm font-medium text-[#c73535]">
            {errorMessages[params.error] ?? "Action belum berhasil."}
          </div>
        ) : null}

        <div className="grid gap-6">
          <details className="hidden rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <summary className="flex cursor-pointer items-center justify-between gap-3 text-lg font-semibold">
              <span>Tambah Parent</span>
              <span className="rounded-md bg-[#0b6ffb] px-3 py-2 text-sm font-semibold text-white">
                Open Form
              </span>
            </summary>
            <section className="pt-5">
            <div className="border-b border-[#e6edf5] pb-5">
              <h2 className="text-lg font-semibold">Tambah Parent</h2>
              <p className="mt-1 text-sm text-[#6b7890]">
                Parent bisa dihubungkan ke student saat membuat data murid.
              </p>
            </div>

            <form action={createParent} className="grid gap-4 pt-5">
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Nama parent</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  disabled={!canManageParents}
                  placeholder="Nama orang tua / wali"
                  className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Phone</span>
                  <input
                    name="phone"
                    disabled={!canManageParents}
                    placeholder="0812-0000-0000"
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Email</span>
                  <input
                    name="email"
                    type="email"
                    disabled={!canManageParents}
                    placeholder="parent@email.com"
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Alamat</span>
                <textarea
                  name="address"
                  rows={3}
                  disabled={!canManageParents}
                  placeholder="Alamat parent"
                  className="resize-none rounded-md border border-[#d7e0ea] bg-white px-3 py-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </label>
              <PendingButton
                disabled={!canManageParents}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                pendingChildren="Menambahkan parent..."
              >
                <UserPlus className="size-4" aria-hidden="true" />
                Tambah Parent
              </PendingButton>
            </form>
            </section>
          </details>

          <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-[#e6edf5] pb-5">
              <div>
                <h2 className="text-lg font-semibold">Parent Aktif</h2>
                <p className="mt-1 text-sm text-[#6b7890]">
                  Menampilkan {parents.length} parent terbaru
                  {query ? ` untuk "${query}"` : ""}.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <details className="relative">
                  <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-md bg-[#0b6ffb] text-white transition hover:bg-[#075bc9] [&::-webkit-details-marker]:hidden">
                    <Plus className="size-5" aria-hidden="true" />
                    <span className="sr-only">Tambah parent</span>
                  </summary>
                  <div className="absolute right-0 z-30 mt-2 w-[min(520px,calc(100vw-2rem))] rounded-md border border-[#dfe6ef] bg-white p-5 shadow-xl">
                    <div className="border-b border-[#e6edf5] pb-4">
                      <h3 className="text-base font-semibold">Tambah Parent</h3>
                      <p className="mt-1 text-sm text-[#6b7890]">
                        Parent bisa dihubungkan ke student saat membuat data murid.
                      </p>
                    </div>
                    <form action={createParent} className="grid gap-4 pt-5">
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold">Nama parent</span>
                        <input
                          name="name"
                          required
                          minLength={2}
                          disabled={!canManageParents}
                          placeholder="Nama orang tua / wali"
                          className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold">Phone</span>
                          <input
                            name="phone"
                            disabled={!canManageParents}
                            placeholder="0812-0000-0000"
                            className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                        </label>
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold">Email</span>
                          <input
                            name="email"
                            type="email"
                            disabled={!canManageParents}
                            placeholder="parent@email.com"
                            className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                        </label>
                      </div>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold">Alamat</span>
                        <textarea
                          name="address"
                          rows={3}
                          disabled={!canManageParents}
                          placeholder="Alamat parent"
                          className="resize-none rounded-md border border-[#d7e0ea] bg-white px-3 py-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                      </label>
                      <PendingButton
                        disabled={!canManageParents}
                        className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                        pendingChildren="Menambahkan parent..."
                      >
                        <UserPlus className="size-4" aria-hidden="true" />
                        Tambah Parent
                      </PendingButton>
                    </form>
                  </div>
                </details>
                <Users className="size-5 text-[#0b6ffb]" aria-hidden="true" />
              </div>
            </div>
            <ListSearch
              clearHref="/app/parents"
              placeholder="Cari parent, phone, email, atau alamat"
              query={query}
            />

            <div className="grid gap-3 pt-5">
              {parents.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                  Belum ada parent.
                </div>
              ) : null}

              {parents.map((parent) => (
                <article
                  key={parent.id}
                  className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4"
                >
                  <Link
                    href={`/app/parents/${parent.id}`}
                    className="flex flex-col gap-3 rounded-md transition hover:text-[#075bc9] sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">
                        {parent.name}
                      </h3>
                      <p className="mt-1 text-xs text-[#6b7890]">
                        {parent.phone || parent.email || "Belum ada kontak"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#536174]">
                        {parent.address || "Alamat belum diisi."}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                      {parent._count.students} student
                    </span>
                  </Link>

                  <details className="mt-4 border-t border-[#e6edf5] pt-3">
                    <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#536174]">
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Edit parent
                    </summary>
                    <form action={updateParent} className="mt-3 grid gap-3">
                      <input type="hidden" name="parentId" value={parent.id} />
                      <input
                        name="name"
                        required
                        minLength={2}
                        defaultValue={parent.name}
                        disabled={!canManageParents}
                        className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          name="phone"
                          defaultValue={parent.phone ?? ""}
                          disabled={!canManageParents}
                          placeholder="Phone"
                          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <input
                          name="email"
                          type="email"
                          defaultValue={parent.email ?? ""}
                          disabled={!canManageParents}
                          placeholder="Email"
                          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                      </div>
                      <textarea
                        name="address"
                        rows={3}
                        defaultValue={parent.address ?? ""}
                        disabled={!canManageParents}
                        placeholder="Alamat"
                        className="resize-none rounded-md border border-[#d7e0ea] bg-white px-3 py-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                      />
                      <PendingButton
                        disabled={!canManageParents}
                        className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9] disabled:cursor-wait disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        pendingChildren="Saving..."
                      >
                        Save Parent
                      </PendingButton>
                    </form>
                  </details>

                  <form action={deleteParent} className="mt-3">
                    <input type="hidden" name="parentId" value={parent.id} />
                    <PendingButton
                      disabled={!canManageParents || parent._count.students > 0}
                      className="flex h-9 items-center gap-2 rounded-md border border-[#f4c6c6] bg-white px-3 text-xs font-semibold text-[#c73535] transition hover:bg-[#fff4f4] disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:text-[#d8a4a4]"
                      pendingChildren="Deleting..."
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Delete Parent
                    </PendingButton>
                  </form>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppPageShell>
  );
}
