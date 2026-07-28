import { ProgramLevel } from "@prisma/client";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  FolderPlus,
  Layers,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { AppPageShell } from "@/app/app/app-page-shell";
import {
  createCategory,
  createProgram,
  deleteCategory,
  deleteProgram,
  updateCategory,
  updateProgram,
} from "@/app/app/programs/actions";
import { PendingButton } from "@/components/pending-button";
import { requireWorkspaceContext } from "@/lib/organization";
import { formOptionLimit, pageListLimit } from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";

export const dynamic = "force-dynamic";

const programLevelLabels = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
} satisfies Record<ProgramLevel, string>;

const statusMessages = {
  categoryCreated: "Category berhasil ditambahkan.",
  categoryDeleted: "Category berhasil dihapus.",
  categoryUpdated: "Category berhasil diperbarui.",
  created: "Program berhasil ditambahkan.",
  deleted: "Program berhasil dihapus.",
  updated: "Program berhasil diperbarui.",
} as const;

const errorMessages = {
  category: "Category tidak ditemukan.",
  "category-exists": "Nama category sudah dipakai.",
  "category-has-programs": "Category masih punya program.",
  "category-name": "Nama category minimal 2 karakter.",
  permission: "Akun kamu belum bisa mengelola program di organization ini.",
  program: "Program tidak ditemukan.",
  "program-has-records": "Program masih dipakai oleh class atau paket harga.",
  "program-name": "Nama program minimal 2 karakter.",
  "program-numbers": "Durasi, total sesi, dan max student wajib lebih dari 0.",
} as const;

type ProgramsSearchParams = {
  categoryCreated?: string;
  categoryDeleted?: string;
  categoryUpdated?: string;
  created?: string;
  deleted?: string;
  error?: keyof typeof errorMessages;
  updated?: string;
};

function statusKey(params: ProgramsSearchParams) {
  return (
    [
      "created",
      "updated",
      "deleted",
      "categoryCreated",
      "categoryUpdated",
      "categoryDeleted",
    ] as const
  ).find((key) => params[key]);
}

function formatLevel(level: ProgramLevel | null) {
  return level ? programLevelLabels[level] : "Tanpa level";
}

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<ProgramsSearchParams>;
}) {
  const params = await searchParams;
  const { organization, membership, organizations } =
    await requireWorkspaceContext("/app/programs");
  const canManagePrograms = hasOrganizationPermission(
    membership,
    "classes.manage",
  );
  const activeStatus = statusKey(params);

  const [categories, programs] = await Promise.all([
    prisma.category.findMany({
      where: { organizationId: organization.id },
      include: { _count: { select: { programs: true } } },
      orderBy: { name: "asc" },
      take: formOptionLimit,
    }),
    prisma.program.findMany({
      where: { organizationId: organization.id },
      include: {
        category: true,
        _count: { select: { classes: true, pricingPlans: true } },
      },
      orderBy: { createdAt: "desc" },
      take: pageListLimit,
    }),
  ]);
  const canCreateProgram = canManagePrograms && categories.length > 0;

  return (
    <AppPageShell
      activePath="/app/programs"
      activeRole={membership.customRole?.name ?? membership.role}
      eyebrow="Programs"
      organization={organization}
      organizations={organizations}
      title="Program Data"
    >
      <div className="mx-auto max-w-7xl">
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
          <div className="hidden gap-6">
            <details className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-lg font-semibold">
                <span>Tambah Category</span>
                <span className="rounded-md bg-[#0b6ffb] px-3 py-2 text-sm font-semibold text-white">
                  Open Form
                </span>
              </summary>
              <section className="pt-5">
              <div className="border-b border-[#e6edf5] pb-5">
                <h2 className="text-lg font-semibold">Tambah Category</h2>
                <p className="mt-1 text-sm text-[#6b7890]">
                  Category memisahkan jenis program seperti Robotics, Coding,
                  atau Private.
                </p>
              </div>

              <form action={createCategory} className="grid gap-4 pt-5">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Nama category</span>
                  <input
                    name="name"
                    required
                    minLength={2}
                    disabled={!canManagePrograms}
                    placeholder="Robotics"
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Description</span>
                  <textarea
                    name="description"
                    rows={3}
                    disabled={!canManagePrograms}
                    placeholder="Program berbasis robotik dan engineering"
                    className="resize-none rounded-md border border-[#d7e0ea] bg-white px-3 py-2 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>
                <PendingButton
                  disabled={!canManagePrograms}
                  className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                  pendingChildren="Menambahkan category..."
                >
                  <FolderPlus className="size-4" aria-hidden="true" />
                  Tambah Category
                </PendingButton>
              </form>
              </section>
            </details>

            <details className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-lg font-semibold">
                <span>Tambah Program</span>
                <span className="rounded-md bg-[#0b6ffb] px-3 py-2 text-sm font-semibold text-white">
                  Open Form
                </span>
              </summary>
              <section className="pt-5">
              <div className="border-b border-[#e6edf5] pb-5">
                <h2 className="text-lg font-semibold">Tambah Program</h2>
                <p className="mt-1 text-sm text-[#6b7890]">
                  Program akan dipakai untuk membuat class, enrollment, dan
                  paket harga.
                </p>
              </div>

              <form action={createProgram} className="grid gap-4 pt-5">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Category</span>
                  <select
                    name="categoryId"
                    required
                    disabled={!canCreateProgram}
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Pilih category
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Nama program</span>
                  <input
                    name="name"
                    required
                    minLength={2}
                    disabled={!canCreateProgram}
                    placeholder="Robotics Basic"
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Level</span>
                  <select
                    name="level"
                    disabled={!canCreateProgram}
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    defaultValue=""
                  >
                    <option value="">Tanpa level</option>
                    {Object.entries(programLevelLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Durasi</span>
                    <input
                      name="sessionDuration"
                      type="number"
                      min={1}
                      required
                      disabled={!canCreateProgram}
                      placeholder="90"
                      className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Total sesi</span>
                    <input
                      name="totalSessions"
                      type="number"
                      min={1}
                      required
                      disabled={!canCreateProgram}
                      placeholder="12"
                      className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Max</span>
                    <input
                      name="maxStudents"
                      type="number"
                      min={1}
                      required
                      disabled={!canCreateProgram}
                      placeholder="8"
                      className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Description</span>
                  <textarea
                    name="description"
                    rows={3}
                    disabled={!canCreateProgram}
                    placeholder="Materi utama, target skill, atau catatan program"
                    className="resize-none rounded-md border border-[#d7e0ea] bg-white px-3 py-2 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>

                <PendingButton
                  disabled={!canCreateProgram}
                  className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                  pendingChildren="Menambahkan program..."
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Tambah Program
                </PendingButton>
              </form>
              </section>
            </details>
          </div>

          <div className="grid gap-6">
            <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 border-b border-[#e6edf5] pb-5">
                <div>
                  <h2 className="text-lg font-semibold">Program Aktif</h2>
                  <p className="mt-1 text-sm text-[#6b7890]">
                    {programs.length} program di organization ini.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <details className="relative">
                    <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-md bg-[#0b6ffb] text-white transition hover:bg-[#075bc9] [&::-webkit-details-marker]:hidden">
                      <Plus className="size-5" aria-hidden="true" />
                      <span className="sr-only">Tambah program</span>
                    </summary>
                    <div className="absolute right-0 z-30 mt-2 w-[min(620px,calc(100vw-2rem))] rounded-md border border-[#dfe6ef] bg-white p-5 shadow-xl">
                      <div className="border-b border-[#e6edf5] pb-4">
                        <h3 className="text-base font-semibold">Tambah Program</h3>
                        <p className="mt-1 text-sm text-[#6b7890]">
                          Program akan dipakai untuk class, enrollment, dan paket harga.
                        </p>
                      </div>
                      <form action={createProgram} className="grid gap-4 pt-5">
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold">Category</span>
                          <select
                            name="categoryId"
                            required
                            disabled={!canCreateProgram}
                            className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Pilih category
                            </option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold">Nama program</span>
                          <input
                            name="name"
                            required
                            minLength={2}
                            disabled={!canCreateProgram}
                            placeholder="Robotics Basic"
                            className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                        </label>
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold">Level</span>
                          <select
                            name="level"
                            disabled={!canCreateProgram}
                            className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                            defaultValue=""
                          >
                            <option value="">Tanpa level</option>
                            {Object.entries(programLevelLabels).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <input
                            name="sessionDuration"
                            type="number"
                            min={1}
                            required
                            disabled={!canCreateProgram}
                            placeholder="Durasi menit"
                            className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                          <input
                            name="totalSessions"
                            type="number"
                            min={1}
                            required
                            disabled={!canCreateProgram}
                            placeholder="Total sesi"
                            className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                          <input
                            name="maxStudents"
                            type="number"
                            min={1}
                            required
                            disabled={!canCreateProgram}
                            placeholder="Max student"
                            className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                        </div>
                        <textarea
                          name="description"
                          rows={3}
                          disabled={!canCreateProgram}
                          placeholder="Materi utama, target skill, atau catatan program"
                          className="resize-none rounded-md border border-[#d7e0ea] bg-white px-3 py-2 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <PendingButton
                          disabled={!canCreateProgram}
                          className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                          pendingChildren="Menambahkan program..."
                        >
                          <Plus className="size-4" aria-hidden="true" />
                          Tambah Program
                        </PendingButton>
                      </form>
                    </div>
                  </details>
                  <BookOpen className="size-5 text-[#0b6ffb]" aria-hidden="true" />
                </div>
              </div>

              <div className="grid gap-3 pt-5">
                {programs.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                    Belum ada program.
                  </div>
                ) : null}

                {programs.map((program) => {
                  const locked =
                    program._count.classes > 0 ||
                    program._count.pricingPlans > 0;

                  return (
                    <article
                      key={program.id}
                      className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4 transition hover:border-[#0b6ffb] hover:bg-[#f8fbff]"
                    >
                      <Link
                        href={`/app/programs/${program.id}`}
                        className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold">
                              {program.name}
                            </h3>
                            <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                              {program.category.name}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-[#6b7890]">
                            {formatLevel(program.level)} |{" "}
                            {program.sessionDuration} menit |{" "}
                            {program.totalSessions} sesi | max{" "}
                            {program.maxStudents} student
                          </p>
                          {program.description ? (
                            <p className="mt-2 text-sm text-[#536174]">
                              {program.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <span className="rounded-md bg-[#e7f8ef] px-2 py-1 text-xs font-semibold text-[#16834a]">
                            {program._count.classes} class
                          </span>
                          <span className="rounded-md bg-[#fff3d8] px-2 py-1 text-xs font-semibold text-[#a56600]">
                            {program._count.pricingPlans} paket
                          </span>
                        </div>
                      </Link>

                      <details className="mt-4 border-t border-[#e6edf5] pt-3">
                        <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#536174]">
                          <Pencil className="size-3.5" aria-hidden="true" />
                          Edit program
                        </summary>
                        <form action={updateProgram} className="mt-3 grid gap-3">
                          <input
                            type="hidden"
                            name="programId"
                            value={program.id}
                          />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <select
                              name="categoryId"
                              required
                              defaultValue={program.categoryId}
                              disabled={!canManagePrograms}
                              className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                            >
                              {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                            <input
                              name="name"
                              required
                              minLength={2}
                              defaultValue={program.name}
                              disabled={!canManagePrograms}
                              className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                            />
                          </div>

                          <div className="grid gap-3 sm:grid-cols-4">
                            <select
                              name="level"
                              defaultValue={program.level ?? ""}
                              disabled={!canManagePrograms}
                              className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                            >
                              <option value="">Tanpa level</option>
                              {Object.entries(programLevelLabels).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                            <input
                              name="sessionDuration"
                              type="number"
                              min={1}
                              required
                              defaultValue={program.sessionDuration}
                              disabled={!canManagePrograms}
                              className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                            />
                            <input
                              name="totalSessions"
                              type="number"
                              min={1}
                              required
                              defaultValue={program.totalSessions}
                              disabled={!canManagePrograms}
                              className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                            />
                            <input
                              name="maxStudents"
                              type="number"
                              min={1}
                              required
                              defaultValue={program.maxStudents}
                              disabled={!canManagePrograms}
                              className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                            />
                          </div>

                          <textarea
                            name="description"
                            rows={2}
                            defaultValue={program.description ?? ""}
                            disabled={!canManagePrograms}
                            placeholder="Description"
                            className="resize-none rounded-md border border-[#d7e0ea] bg-white px-3 py-2 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />

                          <PendingButton
                            disabled={!canManagePrograms}
                            className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9] disabled:cursor-wait disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                            pendingChildren="Saving..."
                          >
                            Save Program
                          </PendingButton>
                        </form>
                      </details>

                      <form action={deleteProgram} className="mt-3">
                        <input
                          type="hidden"
                          name="programId"
                          value={program.id}
                        />
                        <PendingButton
                          disabled={!canManagePrograms || locked}
                          className="flex h-9 items-center gap-2 rounded-md border border-[#f4c6c6] bg-white px-3 text-xs font-semibold text-[#c73535] transition hover:bg-[#fff4f4] disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:text-[#d8a4a4]"
                          pendingChildren="Deleting..."
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          Delete Program
                        </PendingButton>
                      </form>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 border-b border-[#e6edf5] pb-5">
                <div>
                  <h2 className="text-lg font-semibold">Categories</h2>
                  <p className="mt-1 text-sm text-[#6b7890]">
                    {categories.length} category tersedia.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <details className="relative">
                    <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-md bg-[#0b6ffb] text-white transition hover:bg-[#075bc9] [&::-webkit-details-marker]:hidden">
                      <Plus className="size-5" aria-hidden="true" />
                      <span className="sr-only">Tambah category</span>
                    </summary>
                    <div className="absolute right-0 z-30 mt-2 w-[min(520px,calc(100vw-2rem))] rounded-md border border-[#dfe6ef] bg-white p-5 shadow-xl">
                      <div className="border-b border-[#e6edf5] pb-4">
                        <h3 className="text-base font-semibold">Tambah Category</h3>
                        <p className="mt-1 text-sm text-[#6b7890]">
                          Category memisahkan jenis program seperti Robotics, Coding, atau Private.
                        </p>
                      </div>
                      <form action={createCategory} className="grid gap-4 pt-5">
                        <input
                          name="name"
                          required
                          minLength={2}
                          disabled={!canManagePrograms}
                          placeholder="Robotics"
                          className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <textarea
                          name="description"
                          rows={3}
                          disabled={!canManagePrograms}
                          placeholder="Program berbasis robotik dan engineering"
                          className="resize-none rounded-md border border-[#d7e0ea] bg-white px-3 py-2 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <PendingButton
                          disabled={!canManagePrograms}
                          className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                          pendingChildren="Menambahkan category..."
                        >
                          <FolderPlus className="size-4" aria-hidden="true" />
                          Tambah Category
                        </PendingButton>
                      </form>
                    </div>
                  </details>
                  <Layers className="size-5 text-[#0b6ffb]" aria-hidden="true" />
                </div>
              </div>

              <div className="grid gap-3 pt-5 md:grid-cols-2">
                {categories.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890] md:col-span-2">
                    Belum ada category.
                  </div>
                ) : null}

                {categories.map((category) => (
                  <article
                    key={category.id}
                    className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">
                          {category.name}
                        </h3>
                        <p className="mt-1 text-xs text-[#6b7890]">
                          {category.description || "Tanpa description"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                        {category._count.programs} program
                      </span>
                    </div>

                    <details className="mt-4 border-t border-[#e6edf5] pt-3">
                      <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#536174]">
                        <Pencil className="size-3.5" aria-hidden="true" />
                        Edit category
                      </summary>
                      <form action={updateCategory} className="mt-3 grid gap-3">
                        <input
                          type="hidden"
                          name="categoryId"
                          value={category.id}
                        />
                        <input
                          name="name"
                          required
                          minLength={2}
                          defaultValue={category.name}
                          disabled={!canManagePrograms}
                          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <textarea
                          name="description"
                          rows={2}
                          defaultValue={category.description ?? ""}
                          disabled={!canManagePrograms}
                          placeholder="Description"
                          className="resize-none rounded-md border border-[#d7e0ea] bg-white px-3 py-2 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <PendingButton
                          disabled={!canManagePrograms}
                          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9] disabled:cursor-wait disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          pendingChildren="Saving..."
                        >
                          Save Category
                        </PendingButton>
                      </form>
                    </details>

                    <form action={deleteCategory} className="mt-3">
                      <input
                        type="hidden"
                        name="categoryId"
                        value={category.id}
                      />
                      <PendingButton
                        disabled={
                          !canManagePrograms || category._count.programs > 0
                        }
                        className="flex h-9 items-center gap-2 rounded-md border border-[#f4c6c6] bg-white px-3 text-xs font-semibold text-[#c73535] transition hover:bg-[#fff4f4] disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:text-[#d8a4a4]"
                        pendingChildren="Deleting..."
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                        Delete Category
                      </PendingButton>
                    </form>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppPageShell>
  );
}
