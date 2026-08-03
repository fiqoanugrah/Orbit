import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Clock3,
  Pencil,
  Users,
} from "lucide-react";

import { AppPageShell } from "@/app/app/app-page-shell";
import { updateClass } from "@/app/app/classes/actions";
import { DetailCard, DetailField } from "@/components/detail-card";
import { PendingButton } from "@/components/pending-button";
import { requireWorkspaceContext } from "@/lib/organization";
import { formOptionLimit, pageListLimit } from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const classDetailTabs = ["details", "students", "sessions"] as const;

type ClassDetailTab = (typeof classDetailTabs)[number];

const dayLabels = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

function formatDate(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(value)
    : "-";
}

function getClassDetailTab(value: string | undefined): ClassDetailTab {
  return classDetailTabs.includes(value as ClassDetailTab)
    ? (value as ClassDetailTab)
    : "details";
}

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { classId } = await params;
  const resolvedSearchParams = await searchParams;
  const activeTab = getClassDetailTab(resolvedSearchParams?.tab);
  const { organization, membership, organizations } =
    await requireWorkspaceContext(`/app/classes/${classId}`);
  const canManageClasses = hasOrganizationPermission(
    membership,
    "classes.manage",
  );

  const [classItem, classes, programs, teachers, periods, rooms] =
    await Promise.all([
      prisma.class.findFirst({
        where: { id: classId, organizationId: organization.id },
        include: {
          academicPeriod: true,
          enrollments: {
            include: { student: { include: { parent: true } } },
            orderBy: { createdAt: "desc" },
          },
          program: { include: { category: true } },
          room: true,
          sessions: {
            include: { records: true },
            orderBy: { date: "desc" },
            take: 8,
          },
          teacher: true,
        },
      }),
      prisma.class.findMany({
        where: { organizationId: organization.id },
        include: {
          academicPeriod: true,
          program: true,
          teacher: true,
          _count: { select: { enrollments: true, sessions: true } },
        },
        orderBy: [{ dayOfWeek: "asc" }, { startsAt: "asc" }],
        take: pageListLimit,
      }),
      prisma.program.findMany({
        where: { organizationId: organization.id },
        include: { category: true },
        orderBy: { name: "asc" },
        take: formOptionLimit,
      }),
      prisma.teacher.findMany({
        where: { organizationId: organization.id },
        orderBy: { name: "asc" },
        take: formOptionLimit,
      }),
      prisma.academicPeriod.findMany({
        where: { organizationId: organization.id },
        orderBy: { createdAt: "desc" },
        take: formOptionLimit,
      }),
      prisma.room.findMany({
        where: { organizationId: organization.id },
        orderBy: { name: "asc" },
        take: formOptionLimit,
      }),
    ]);

  if (!classItem) {
    notFound();
  }

  const activeEnrollments = classItem.enrollments.filter(
    (enrollment) => enrollment.status === "ACTIVE",
  );
  const currentPath = `/app/classes/${classItem.id}`;
  const detailNav = [
    {
      badge: classItem.program.category.name,
      href: `${currentPath}?tab=details`,
      icon: BookOpen,
      key: "details",
      label: "Details",
    },
    {
      badge: String(activeEnrollments.length),
      href: `${currentPath}?tab=students`,
      icon: Users,
      key: "students",
      label: "Students",
    },
    {
      badge: String(classItem.sessions.length),
      href: `${currentPath}?tab=sessions`,
      icon: Clock3,
      key: "sessions",
      label: "Sessions",
    },
  ] satisfies Array<{
    badge: string;
    href: string;
    icon: typeof BookOpen;
    key: ClassDetailTab;
    label: string;
  }>;

  return (
    <AppPageShell
      activePath="/app/classes"
      activeRole={membership.customRole?.name ?? membership.role}
      eyebrow="Class Detail"
      organization={organization}
      organizations={organizations}
      title={classItem.name}
    >
      <div className="mx-auto grid max-w-[1600px] gap-6 xl:grid-cols-[300px_320px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-md border border-[#dfe6ef] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#e6edf5] pb-4">
            <div>
              <h2 className="text-lg font-semibold">Classes</h2>
              <p className="mt-1 text-xs text-[#6b7890]">
                {classes.length} class dibuat
              </p>
            </div>
            <Link
              href="/app/classes"
              className="rounded-md border border-[#d7e0ea] px-3 py-2 text-xs font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
            >
              List
            </Link>
          </div>

          <div className="mt-4 grid max-h-[760px] gap-2 overflow-y-auto pr-1">
            {classes.map((item) => (
              <Link
                key={item.id}
                href={`/app/classes/${item.id}?tab=${activeTab}`}
                className={cn(
                  "block rounded-md border p-3 transition",
                  item.id === classItem.id
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
                      {item.program.name} - {item.teacher.name}
                    </p>
                  </div>
                  <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-[11px] font-semibold text-[#075bc9]">
                    {item._count.enrollments}
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold text-[#536174]">
                  {dayLabels[item.dayOfWeek]}, {item.startsAt}
                </p>
              </Link>
            ))}
          </div>
        </aside>

        <aside className="min-w-0 rounded-md border border-[#dfe6ef] bg-white shadow-sm">
          <div className="h-24 rounded-t-md bg-[#e6eef7]" />
          <div className="-mt-12 px-5 pb-5 text-center">
            <div className="mx-auto grid size-28 place-items-center rounded-md border border-[#d7e0ea] bg-white text-[#0b6ffb] shadow-sm">
              <CalendarDays className="size-16" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">{classItem.name}</h2>
            <p className="mt-1 text-sm font-semibold text-[#9aa7b8]">
              {classItem.program.name}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="rounded-md bg-[#dff2ff] px-3 py-1 text-sm font-semibold text-[#075bc9]">
                {dayLabels[classItem.dayOfWeek]}
              </span>
              <span className="rounded-md bg-[#f1f5f9] px-3 py-1 text-sm font-semibold text-[#536174]">
                {classItem.startsAt}
                {classItem.endsAt ? ` - ${classItem.endsAt}` : ""}
              </span>
              <span className="rounded-md bg-[#e7f8ef] px-3 py-1 text-sm font-semibold text-[#16834a]">
                {activeEnrollments.length} active
              </span>
            </div>
          </div>

          <nav className="border-t border-[#e6edf5] p-4">
            {detailNav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md px-3 py-3 text-sm font-semibold transition",
                  activeTab === item.key
                    ? "bg-[#eef5ff] text-[#075bc9]"
                    : "text-[#172033] hover:bg-[#f6f8fb] hover:text-[#075bc9]",
                )}
              >
                <span className="flex items-center gap-3">
                  <item.icon
                    className={cn(
                      "size-5",
                      activeTab === item.key
                        ? "text-[#0b6ffb]"
                        : "text-[#536174]",
                    )}
                    aria-hidden="true"
                  />
                  {item.label}
                </span>
                <span className="max-w-32 truncate rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                  {item.badge}
                </span>
              </Link>
            ))}
          </nav>
        </aside>

        <div className="grid min-w-0 gap-6">
          <Link
            href="/app/classes"
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Classes
          </Link>

          {activeTab === "details" ? (
            <DetailCard icon={Pencil} title="Edit Class">
              <form action={updateClass} className="grid gap-4">
                <input type="hidden" name="classId" value={classItem.id} />
                <input
                  type="hidden"
                  name="redirectTo"
                  value={`${currentPath}?tab=details&updated=1`}
                />
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Nama class</span>
                  <input
                    name="name"
                    required
                    minLength={2}
                    defaultValue={classItem.name}
                    disabled={!canManageClasses}
                    className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Program</span>
                    <select
                      name="programId"
                      required
                      defaultValue={classItem.programId}
                      disabled={!canManageClasses}
                      className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    >
                      {programs.map((program) => (
                        <option key={program.id} value={program.id}>
                          {program.name} - {program.category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Teacher</span>
                    <select
                      name="teacherId"
                      required
                      defaultValue={classItem.teacherId}
                      disabled={!canManageClasses}
                      className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    >
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Academic period</span>
                    <select
                      name="academicPeriodId"
                      required
                      defaultValue={classItem.academicPeriodId}
                      disabled={!canManageClasses}
                      className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    >
                      {periods.map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Room</span>
                    <select
                      name="roomId"
                      defaultValue={classItem.roomId ?? ""}
                      disabled={!canManageClasses}
                      className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    >
                      <option value="">Tanpa room</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Hari</span>
                    <select
                      name="dayOfWeek"
                      required
                      defaultValue={classItem.dayOfWeek}
                      disabled={!canManageClasses}
                      className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    >
                      {dayLabels.map((day, index) => (
                        <option key={day} value={index}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Mulai</span>
                    <input
                      name="startsAt"
                      type="time"
                      required
                      defaultValue={classItem.startsAt}
                      disabled={!canManageClasses}
                      className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Selesai</span>
                    <input
                      name="endsAt"
                      type="time"
                      defaultValue={classItem.endsAt ?? ""}
                      disabled={!canManageClasses}
                      className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Max</span>
                    <input
                      name="maxStudents"
                      type="number"
                      min={1}
                      required
                      defaultValue={classItem.maxStudents}
                      disabled={!canManageClasses}
                      className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                    />
                  </label>
                </div>

                <PendingButton
                  disabled={!canManageClasses}
                  className="flex h-11 items-center justify-center rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                  pendingChildren="Saving..."
                >
                  Save Class
                </PendingButton>
              </form>
            </DetailCard>
          ) : null}

          {activeTab === "details" ? (
            <DetailCard icon={CalendarDays} title="Class Details">
              <div className="grid gap-6 md:grid-cols-3">
                <DetailField label="Program" value={classItem.program.name} />
                <DetailField label="Teacher" value={classItem.teacher.name} />
                <DetailField label="Room" value={classItem.room?.name ?? "-"} />
                <DetailField
                  label="Period"
                  value={classItem.academicPeriod.name}
                />
                <DetailField
                  label="Schedule"
                  value={`${dayLabels[classItem.dayOfWeek]}, ${classItem.startsAt}${
                    classItem.endsAt ? ` - ${classItem.endsAt}` : ""
                  }`}
                />
                <DetailField label="Max Students" value={classItem.maxStudents} />
              </div>
            </DetailCard>
          ) : null}

          {activeTab === "students" ? (
            <DetailCard icon={Users} title="Students In Class">
              <div className="grid gap-3">
                {classItem.enrollments.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                    Belum ada student di class ini.
                  </div>
                ) : null}

                {classItem.enrollments.map((enrollment) => (
                  <Link
                    key={enrollment.id}
                    href={`/app/students/${enrollment.student.id}?tab=enrollment`}
                    className="flex items-center justify-between gap-3 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3 transition hover:border-[#0b6ffb] hover:bg-[#eef5ff]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {enrollment.student.name}
                      </span>
                      <span className="block truncate text-xs text-[#6b7890]">
                        Parent: {enrollment.student.parent?.name ?? "-"}
                      </span>
                    </span>
                    <span className="rounded-md bg-[#e7f8ef] px-2 py-1 text-xs font-semibold text-[#16834a]">
                      {enrollment.status}
                    </span>
                  </Link>
                ))}
              </div>
            </DetailCard>
          ) : null}

          {activeTab === "sessions" ? (
            <DetailCard icon={Clock3} title="Attendance Sessions">
              <div className="grid gap-3">
                {classItem.sessions.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                    Belum ada attendance session.
                  </div>
                ) : null}

                {classItem.sessions.map((session) => (
                  <article
                    key={session.id}
                    className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">
                          {formatDate(session.date)}
                        </h3>
                        <p className="mt-1 text-xs text-[#6b7890]">
                          {session.notes || "No notes"}
                        </p>
                      </div>
                      <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                        {session.records.length} records
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </DetailCard>
          ) : null}
        </div>
      </div>
    </AppPageShell>
  );
}
