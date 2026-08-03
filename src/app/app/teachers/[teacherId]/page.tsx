import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  GraduationCap,
  ImagePlus,
  Mail,
  Pencil,
  Phone,
} from "lucide-react";

import { AppPageShell } from "@/app/app/app-page-shell";
import { updateTeacher } from "@/app/app/teachers/actions";
import { DetailCard, DetailField } from "@/components/detail-card";
import { PendingButton } from "@/components/pending-button";
import { requireWorkspaceContext } from "@/lib/organization";
import { pageListLimit } from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const dayLabels = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

export default async function TeacherDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ teacherId: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const { teacherId } = await params;
  const statusParams = await searchParams;
  const { organization, membership, organizations } =
    await requireWorkspaceContext(`/app/teachers/${teacherId}`);
  const canManageTeachers = hasOrganizationPermission(
    membership,
    "classes.manage",
  );

  const [teacher, teachers] = await Promise.all([
    prisma.teacher.findFirst({
      where: { id: teacherId, organizationId: organization.id },
      include: {
        classes: {
          include: { academicPeriod: true, program: true, room: true },
          orderBy: [{ dayOfWeek: "asc" }, { startsAt: "asc" }],
        },
      },
    }),
    prisma.teacher.findMany({
      where: { organizationId: organization.id },
      include: { _count: { select: { classes: true } } },
      orderBy: { name: "asc" },
      take: pageListLimit,
    }),
  ]);

  if (!teacher) {
    notFound();
  }

  const currentPath = `/app/teachers/${teacher.id}`;

  return (
    <AppPageShell
      activePath="/app/teachers"
      activeRole={membership.customRole?.name ?? membership.role}
      eyebrow="Teacher Detail"
      organization={organization}
      organizations={organizations}
      title={teacher.name}
    >
      <div className="mx-auto grid max-w-[1500px] gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-md border border-[#dfe6ef] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#e6edf5] pb-4">
            <div>
              <h2 className="text-lg font-semibold">Teachers</h2>
              <p className="mt-1 text-xs text-[#6b7890]">
                {teachers.length} teacher dibuat
              </p>
            </div>
            <Link
              href="/app/teachers"
              className="grid size-10 place-items-center rounded-md border border-[#d7e0ea] text-[#536174] transition hover:bg-[#f1f5f9]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span className="sr-only">Back</span>
            </Link>
          </div>

          <div className="mt-4 grid max-h-[760px] gap-2 overflow-y-auto pr-1">
            {teachers.map((item) => (
              <Link
                key={item.id}
                href={`/app/teachers/${item.id}`}
                className={cn(
                  "block rounded-md border p-3 transition",
                  item.id === teacher.id
                    ? "border-[#cfe0ff] bg-[#eaf8fc]"
                    : "border-[#e6edf5] bg-[#fbfcfe] hover:border-[#0b6ffb] hover:bg-[#eef5ff]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">
                      {item.name}
                    </h3>
                    <p className="mt-1 truncate text-xs text-[#6b7890]">
                      {item.phone || item.email || "Belum ada kontak"}
                    </p>
                  </div>
                  <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-[11px] font-semibold text-[#075bc9]">
                    {item._count.classes}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md bg-[#eaf2ff] text-[#075bc9] ring-1 ring-[#cfe0ff]">
                    {item.photoUrl ? (
                      <img
                        src={item.photoUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <GraduationCap className="size-5" aria-hidden="true" />
                    )}
                  </span>
                  <span className="text-xs font-semibold text-[#536174]">
                    {item._count.classes} class
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </aside>

        <div className="grid min-w-0 gap-6">
          <Link
            href="/app/teachers"
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Teachers
          </Link>

          {statusParams.updated ? (
            <div className="rounded-md bg-[#e7f8ef] px-3 py-2 text-sm font-semibold text-[#16834a]">
              Teacher berhasil diperbarui.
            </div>
          ) : null}

          {statusParams.error === "photo" ? (
            <div className="rounded-md bg-[#ffecec] px-3 py-2 text-sm font-medium text-[#c73535]">
              Foto teacher harus image dan maksimal 5 MB.
            </div>
          ) : null}

          <DetailCard icon={GraduationCap} title="Teacher Summary">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-md border border-[#d7e0ea] bg-[#eaf2ff] text-[#075bc9]">
                {teacher.photoUrl ? (
                  <img
                    src={teacher.photoUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <GraduationCap className="size-16" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-semibold">
                  {teacher.name}
                </h2>
                <p className="mt-2 text-sm text-[#6b7890]">
                  {teacher.phone || teacher.email || "Kontak belum diisi"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-md bg-[#eaf2ff] px-3 py-1 text-sm font-semibold text-[#075bc9]">
                    {teacher.classes.length} class
                  </span>
                  <span className="rounded-md bg-[#e7f8ef] px-3 py-1 text-sm font-semibold text-[#16834a]">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </DetailCard>

          <DetailCard icon={Pencil} title="Edit Teacher">
            <form action={updateTeacher} className="grid gap-4">
              <input type="hidden" name="teacherId" value={teacher.id} />
              <input
                type="hidden"
                name="redirectTo"
                value={`${currentPath}?updated=1`}
              />
              <label className="grid gap-2 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <ImagePlus className="size-4" aria-hidden="true" />
                  Foto teacher
                </span>
                {teacher.photoUrl ? (
                  <img
                    src={teacher.photoUrl}
                    alt=""
                    className="size-16 rounded-md border border-[#d7e0ea] object-cover"
                  />
                ) : null}
                <input
                  name="photo"
                  type="file"
                  accept="image/*"
                  disabled={!canManageTeachers}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#eaf2ff] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#075bc9] disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Nama teacher</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  defaultValue={teacher.name}
                  disabled={!canManageTeachers}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  name="phone"
                  defaultValue={teacher.phone ?? ""}
                  disabled={!canManageTeachers}
                  placeholder="Phone"
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
                <input
                  name="email"
                  type="email"
                  defaultValue={teacher.email ?? ""}
                  disabled={!canManageTeachers}
                  placeholder="Email"
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </div>
              <PendingButton
                disabled={!canManageTeachers}
                className="flex h-11 items-center justify-center rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                pendingChildren="Saving..."
              >
                Save Teacher
              </PendingButton>
            </form>
          </DetailCard>

          <DetailCard icon={GraduationCap} title="Teacher Details">
            <div className="grid gap-6 md:grid-cols-3">
              <DetailField label="Name" value={teacher.name} />
              <DetailField label="Phone" value={teacher.phone ?? "-"} />
              <DetailField label="Email" value={teacher.email ?? "-"} />
              <DetailField label="Classes" value={teacher.classes.length} />
            </div>
          </DetailCard>

          <DetailCard icon={CalendarDays} title="Classes">
            <div className="grid gap-3">
              {teacher.classes.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                  Teacher belum punya class.
                </div>
              ) : null}
              {teacher.classes.map((classItem) => (
                <Link
                  key={classItem.id}
                  href={`/app/classes/${classItem.id}`}
                  className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3 transition hover:border-[#0b6ffb] hover:bg-[#eef5ff]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">
                        {classItem.name}
                      </h3>
                      <p className="mt-1 text-xs text-[#6b7890]">
                        {classItem.program.name} - {classItem.academicPeriod.name}
                      </p>
                    </div>
                    <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                      {dayLabels[classItem.dayOfWeek]}, {classItem.startsAt}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </DetailCard>

          <DetailCard icon={Phone} title="Contact">
            <div className="grid gap-6 md:grid-cols-2">
              <DetailField
                label="Call"
                value={
                  teacher.phone ? (
                    <a
                      href={`tel:${teacher.phone}`}
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-[#0b6ffb] px-3 text-xs font-semibold text-white"
                    >
                      <Phone className="size-4" />
                      {teacher.phone}
                    </a>
                  ) : (
                    "-"
                  )
                }
              />
              <DetailField
                label="Email"
                value={
                  teacher.email ? (
                    <a
                      href={`mailto:${teacher.email}`}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-xs font-semibold text-[#536174]"
                    >
                      <Mail className="size-4" />
                      {teacher.email}
                    </a>
                  ) : (
                    "-"
                  )
                }
              />
            </div>
          </DetailCard>
        </div>
      </div>
    </AppPageShell>
  );
}
