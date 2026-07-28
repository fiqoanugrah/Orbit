import {
  CheckCircle2,
  GraduationCap,
  Pencil,
  Plus,
  UserCircle,
} from "lucide-react";
import Link from "next/link";

import { AppPageShell } from "@/app/app/app-page-shell";
import {
  StudentCreateForm,
  StudentDeleteForm,
  StudentEditForm,
} from "@/app/app/students/student-forms";
import { ListSearch } from "@/components/list-search";
import {
  requireWorkspaceContext,
} from "@/lib/organization";
import {
  formOptionLimit,
  normalizeSearchParam,
  pageListLimit,
} from "@/lib/performance";
import { hasOrganizationPermission } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusMessages = {
  created: "Student berhasil ditambahkan.",
  updated: "Student berhasil diperbarui.",
  deleted: "Student berhasil dihapus.",
} as const;

const errorMessages = {
  permission: "Akun kamu belum bisa mengelola student di organization ini.",
  name: "Nama student minimal 2 karakter.",
  student: "Student tidak ditemukan.",
  "student-has-records": "Student masih punya enrollment atau invoice.",
} as const;

type StudentsSearchParams = {
  created?: string;
  deleted?: string;
  error?: keyof typeof errorMessages;
  q?: string;
  updated?: string;
};

function statusKey(params: StudentsSearchParams) {
  return (["created", "updated", "deleted"] as const).find((key) => params[key]);
}

function formatDateInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<StudentsSearchParams>;
}) {
  const params = await searchParams;
  const { organization, membership, organizations } =
    await requireWorkspaceContext("/app/students");
  const canManageStudents = hasOrganizationPermission(
    membership,
    "students.manage",
  );
  const activeStatus = statusKey(params);
  const query = normalizeSearchParam(params.q);
  const studentWhere = {
    organizationId: organization.id,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { phone: { contains: query, mode: "insensitive" as const } },
            {
              parent: {
                name: { contains: query, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };

  const [parents, students] = await Promise.all([
    prisma.parent.findMany({
      where: { organizationId: organization.id },
      orderBy: { name: "asc" },
      take: formOptionLimit,
    }),
    prisma.student.findMany({
      where: studentWhere,
      include: {
        parent: true,
        _count: { select: { enrollments: true, invoices: true } },
      },
      orderBy: { createdAt: "desc" },
      take: pageListLimit,
    }),
  ]);

  return (
    <AppPageShell
      activePath="/app/students"
      activeRole={membership.customRole?.name ?? membership.role}
      eyebrow="Students"
      organization={organization}
      organizations={organizations}
      title="Student Data"
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
              <span>Tambah Student</span>
              <span className="rounded-md bg-[#0b6ffb] px-3 py-2 text-sm font-semibold text-white">
                Open Form
              </span>
            </summary>
            <section className="pt-5">
            <div className="border-b border-[#e6edf5] pb-5">
              <h2 className="text-lg font-semibold">Tambah Student</h2>
              <p className="mt-1 text-sm text-[#6b7890]">
                Hubungkan student ke parent jika datanya sudah ada.
              </p>
            </div>

            <StudentCreateForm
              canManageStudents={canManageStudents}
              parents={parents.map((parent) => ({
                id: parent.id,
                name: parent.name,
              }))}
            />
            </section>
          </details>

          <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-[#e6edf5] pb-5">
              <div>
                <h2 className="text-lg font-semibold">Student Aktif</h2>
                <p className="mt-1 text-sm text-[#6b7890]">
                  Menampilkan {students.length} student terbaru
                  {query ? ` untuk "${query}"` : ""}.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <details className="relative">
                  <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-md bg-[#0b6ffb] text-white transition hover:bg-[#075bc9] [&::-webkit-details-marker]:hidden">
                    <Plus className="size-5" aria-hidden="true" />
                    <span className="sr-only">Tambah student</span>
                  </summary>
                  <div className="absolute right-0 z-30 mt-2 w-[min(520px,calc(100vw-2rem))] rounded-md border border-[#dfe6ef] bg-white p-5 shadow-xl">
                    <div className="border-b border-[#e6edf5] pb-4">
                      <h3 className="text-base font-semibold">Tambah Student</h3>
                      <p className="mt-1 text-sm text-[#6b7890]">
                        Hubungkan student ke parent jika datanya sudah ada.
                      </p>
                    </div>
                    <StudentCreateForm
                      canManageStudents={canManageStudents}
                      parents={parents.map((parent) => ({
                        id: parent.id,
                        name: parent.name,
                      }))}
                    />
                  </div>
                </details>
                <GraduationCap
                  className="size-5 text-[#0b6ffb]"
                  aria-hidden="true"
                />
              </div>
            </div>
            <ListSearch
              clearHref="/app/students"
              placeholder="Cari student, parent, atau phone"
              query={query}
            />

            <div className="grid gap-3 pt-5">
              {students.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                  Belum ada student.
                </div>
              ) : null}

              {students.map((student) => (
                <article
                  key={student.id}
                  className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4"
                >
                  <Link
                    href={`/app/students/${student.id}`}
                    className="flex flex-col gap-3 rounded-md transition hover:text-[#075bc9] sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex min-w-0 gap-3">
                      <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-[#eaf2ff] text-[#075bc9] ring-1 ring-[#cfe0ff]">
                        {student.photoUrl ? (
                          <img
                            src={student.photoUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <UserCircle className="size-7" aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">
                          {student.name}
                        </h3>
                        <p className="mt-1 text-xs text-[#6b7890]">
                          Parent: {student.parent?.name ?? "Belum dihubungkan"}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#536174]">
                          {student.notes || student.phone || "Belum ada catatan."}
                        </p>
                      </span>
                    </div>
                    <span className="shrink-0 rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                      {student._count.enrollments} enrollment
                    </span>
                  </Link>

                  <details className="mt-4 border-t border-[#e6edf5] pt-3">
                    <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#536174]">
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Edit student
                    </summary>
                    <StudentEditForm
                      canManageStudents={canManageStudents}
                      parents={parents.map((parent) => ({
                        id: parent.id,
                        name: parent.name,
                      }))}
                      student={{
                        birthDate: formatDateInput(student.birthDate),
                        id: student.id,
                        name: student.name,
                        notes: student.notes ?? "",
                        parentId: student.parentId ?? "",
                        phone: student.phone ?? "",
                        photoUrl: student.photoUrl ?? "",
                      }}
                    />
                  </details>

                  <StudentDeleteForm
                    canDelete={
                      canManageStudents &&
                      student._count.enrollments === 0 &&
                      student._count.invoices === 0
                    }
                    studentId={student.id}
                  />
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppPageShell>
  );
}
