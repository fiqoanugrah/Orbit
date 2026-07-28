import {
  CheckCircle2,
  GraduationCap,
  ImagePlus,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

import { AppPageShell } from "@/app/app/app-page-shell";
import {
  createTeacher,
  deleteTeacher,
  updateTeacher,
} from "@/app/app/teachers/actions";
import { ListSearch } from "@/components/list-search";
import { PendingButton } from "@/components/pending-button";
import { requireWorkspaceContext } from "@/lib/organization";
import { normalizeSearchParam, pageListLimit } from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";

export const dynamic = "force-dynamic";

const statusMessages = {
  created: "Teacher berhasil ditambahkan.",
  updated: "Teacher berhasil diperbarui.",
  deleted: "Teacher berhasil dihapus.",
} as const;

const errorMessages = {
  permission: "Akun kamu belum bisa mengelola teacher di organization ini.",
  name: "Nama teacher minimal 2 karakter.",
  teacher: "Teacher tidak ditemukan.",
  "teacher-has-classes": "Teacher masih dipakai oleh class.",
} as const;

type TeachersSearchParams = {
  created?: string;
  deleted?: string;
  error?: keyof typeof errorMessages;
  q?: string;
  updated?: string;
};

function statusKey(params: TeachersSearchParams) {
  return (["created", "updated", "deleted"] as const).find((key) => params[key]);
}

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<TeachersSearchParams>;
}) {
  const params = await searchParams;
  const { organization, membership, organizations } =
    await requireWorkspaceContext("/app/teachers");
  const canManageTeachers = hasOrganizationPermission(
    membership,
    "classes.manage",
  );
  const activeStatus = statusKey(params);
  const query = normalizeSearchParam(params.q);

  const teachers = await prisma.teacher.findMany({
    where: {
      organizationId: organization.id,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { classes: true } } },
    orderBy: { createdAt: "desc" },
    take: pageListLimit,
  });

  return (
    <AppPageShell
      activePath="/app/teachers"
      activeRole={membership.customRole?.name ?? membership.role}
      eyebrow="Teachers"
      organization={organization}
      organizations={organizations}
      title="Teacher Data"
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
          <section className="hidden rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="border-b border-[#e6edf5] pb-5">
              <h2 className="text-lg font-semibold">Tambah Teacher</h2>
              <p className="mt-1 text-sm text-[#6b7890]">
                Teacher akan dipakai saat membuat class dan jadwal belajar.
              </p>
            </div>

              <form action={createTeacher} className="grid gap-4 pt-5">
              <label className="grid gap-2 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <ImagePlus className="size-4" aria-hidden="true" />
                  Foto teacher
                </span>
                <input
                  name="photo"
                  type="file"
                  accept="image/*"
                  disabled={!canManageTeachers}
                  className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#eaf2ff] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#075bc9] disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Nama teacher</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  disabled={!canManageTeachers}
                  placeholder="Nama pengajar"
                  className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Phone</span>
                  <input
                    name="phone"
                    disabled={!canManageTeachers}
                    placeholder="0812-0000-0000"
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Email</span>
                  <input
                    name="email"
                    type="email"
                    disabled={!canManageTeachers}
                    placeholder="teacher@email.com"
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>
              </div>
              <PendingButton
                disabled={!canManageTeachers}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                pendingChildren="Menambahkan teacher..."
              >
                <UserPlus className="size-4" aria-hidden="true" />
                Tambah Teacher
              </PendingButton>
            </form>
          </section>

          <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-[#e6edf5] pb-5">
              <div>
                <h2 className="text-lg font-semibold">Teacher Aktif</h2>
                <p className="mt-1 text-sm text-[#6b7890]">
                  Menampilkan {teachers.length} teacher terbaru
                  {query ? ` untuk "${query}"` : ""}.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <details className="relative">
                  <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-md bg-[#0b6ffb] text-white transition hover:bg-[#075bc9] [&::-webkit-details-marker]:hidden">
                    <Plus className="size-5" aria-hidden="true" />
                    <span className="sr-only">Tambah teacher</span>
                  </summary>
                  <div className="absolute right-0 z-30 mt-2 w-[min(520px,calc(100vw-2rem))] rounded-md border border-[#dfe6ef] bg-white p-5 shadow-xl">
                    <div className="border-b border-[#e6edf5] pb-4">
                      <h3 className="text-base font-semibold">Tambah Teacher</h3>
                      <p className="mt-1 text-sm text-[#6b7890]">
                        Teacher akan dipakai saat membuat class dan jadwal belajar.
                      </p>
                    </div>
                    <form action={createTeacher} className="grid gap-4 pt-5">
                      <label className="grid gap-2 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3">
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          <ImagePlus className="size-4" aria-hidden="true" />
                          Foto teacher
                        </span>
                        <input
                          name="photo"
                          type="file"
                          accept="image/*"
                          disabled={!canManageTeachers}
                          className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#eaf2ff] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#075bc9] disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold">Nama teacher</span>
                        <input
                          name="name"
                          required
                          minLength={2}
                          disabled={!canManageTeachers}
                          placeholder="Nama pengajar"
                          className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold">Phone</span>
                          <input
                            name="phone"
                            disabled={!canManageTeachers}
                            placeholder="0812-0000-0000"
                            className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                        </label>
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold">Email</span>
                          <input
                            name="email"
                            type="email"
                            disabled={!canManageTeachers}
                            placeholder="teacher@email.com"
                            className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                        </label>
                      </div>
                      <PendingButton
                        disabled={!canManageTeachers}
                        className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                        pendingChildren="Menambahkan teacher..."
                      >
                        <UserPlus className="size-4" aria-hidden="true" />
                        Tambah Teacher
                      </PendingButton>
                    </form>
                  </div>
                </details>
                <GraduationCap
                  className="size-5 text-[#0b6ffb]"
                  aria-hidden="true"
                />
              </div>
            </div>
            <ListSearch
              clearHref="/app/teachers"
              placeholder="Cari teacher, phone, atau email"
              query={query}
            />

            <div className="grid gap-3 pt-5">
              {teachers.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                  Belum ada teacher.
                </div>
              ) : null}

              {teachers.map((teacher) => (
                <article
                  key={teacher.id}
                  className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4 transition hover:border-[#0b6ffb] hover:bg-[#f8fbff]"
                >
                  <Link
                    href={`/app/teachers/${teacher.id}`}
                    className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex min-w-0 gap-3">
                      <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-[#eaf2ff] text-[#075bc9] ring-1 ring-[#cfe0ff]">
                        {teacher.photoUrl ? (
                          <img
                            src={teacher.photoUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <GraduationCap className="size-7" aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">
                          {teacher.name}
                        </h3>
                        <p className="mt-1 text-xs text-[#6b7890]">
                          {teacher.phone || teacher.email || "Belum ada kontak"}
                        </p>
                      </span>
                    </div>
                    <span className="shrink-0 rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                      {teacher._count.classes} class
                    </span>
                  </Link>

                  <details className="mt-4 border-t border-[#e6edf5] pt-3">
                    <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#536174]">
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Edit teacher
                    </summary>
                    <form action={updateTeacher} className="mt-3 grid gap-3">
                      <input type="hidden" name="teacherId" value={teacher.id} />
                      <label className="grid gap-2 rounded-md border border-[#e6edf5] bg-white p-3">
                        <span className="flex items-center gap-2 text-xs font-semibold text-[#536174]">
                          <ImagePlus className="size-3.5" aria-hidden="true" />
                          Foto teacher
                        </span>
                        {teacher.photoUrl ? (
                          <img
                            src={teacher.photoUrl}
                            alt=""
                            className="size-14 rounded-md border border-[#d7e0ea] object-cover"
                          />
                        ) : null}
                        <input
                          name="photo"
                          type="file"
                          accept="image/*"
                          disabled={!canManageTeachers}
                          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#eaf2ff] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#075bc9] disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                      </label>
                      <input
                        name="name"
                        required
                        minLength={2}
                        defaultValue={teacher.name}
                        disabled={!canManageTeachers}
                        className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          name="phone"
                          defaultValue={teacher.phone ?? ""}
                          disabled={!canManageTeachers}
                          placeholder="Phone"
                          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <input
                          name="email"
                          type="email"
                          defaultValue={teacher.email ?? ""}
                          disabled={!canManageTeachers}
                          placeholder="Email"
                          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                      </div>
                      <PendingButton
                        disabled={!canManageTeachers}
                        className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9] disabled:cursor-wait disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        pendingChildren="Saving..."
                      >
                        Save Teacher
                      </PendingButton>
                    </form>
                  </details>

                  <form action={deleteTeacher} className="mt-3">
                    <input type="hidden" name="teacherId" value={teacher.id} />
                    <PendingButton
                      disabled={!canManageTeachers || teacher._count.classes > 0}
                      className="flex h-9 items-center gap-2 rounded-md border border-[#f4c6c6] bg-white px-3 text-xs font-semibold text-[#c73535] transition hover:bg-[#fff4f4] disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:text-[#d8a4a4]"
                      pendingChildren="Deleting..."
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Delete Teacher
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
