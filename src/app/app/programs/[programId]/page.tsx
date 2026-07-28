import { ProgramLevel } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Layers,
  Pencil,
} from "lucide-react";

import { AppPageShell } from "@/app/app/app-page-shell";
import { updateProgram } from "@/app/app/programs/actions";
import { DetailCard, DetailField } from "@/components/detail-card";
import { PendingButton } from "@/components/pending-button";
import { requireWorkspaceContext } from "@/lib/organization";
import { formOptionLimit, pageListLimit } from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const programLevelLabels = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
} satisfies Record<ProgramLevel, string>;

function formatLevel(level: ProgramLevel | null) {
  return level ? programLevelLabels[level] : "Tanpa level";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const { organization, membership, organizations } =
    await requireWorkspaceContext(`/app/programs/${programId}`);
  const canManagePrograms = hasOrganizationPermission(
    membership,
    "classes.manage",
  );

  const [program, programs, categories] = await Promise.all([
    prisma.program.findFirst({
      where: { id: programId, organizationId: organization.id },
      include: {
        category: true,
        classes: {
          include: { academicPeriod: true, teacher: true },
          orderBy: [{ dayOfWeek: "asc" }, { startsAt: "asc" }],
        },
        pricingPlans: {
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.program.findMany({
      where: { organizationId: organization.id },
      include: {
        category: true,
        _count: { select: { classes: true, pricingPlans: true } },
      },
      orderBy: { name: "asc" },
      take: pageListLimit,
    }),
    prisma.category.findMany({
      where: { organizationId: organization.id },
      orderBy: { name: "asc" },
      take: formOptionLimit,
    }),
  ]);

  if (!program) {
    notFound();
  }

  const currentPath = `/app/programs/${program.id}`;

  return (
    <AppPageShell
      activePath="/app/programs"
      activeRole={membership.customRole?.name ?? membership.role}
      eyebrow="Program Detail"
      organization={organization}
      organizations={organizations}
      title={program.name}
    >
      <div className="mx-auto grid max-w-[1500px] gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-md border border-[#dfe6ef] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#e6edf5] pb-4">
            <div>
              <h2 className="text-lg font-semibold">Programs</h2>
              <p className="mt-1 text-xs text-[#6b7890]">
                {programs.length} program dibuat
              </p>
            </div>
            <Link
              href="/app/programs"
              className="grid size-10 place-items-center rounded-md border border-[#d7e0ea] text-[#536174] transition hover:bg-[#f1f5f9]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span className="sr-only">Back</span>
            </Link>
          </div>

          <div className="mt-4 grid max-h-[760px] gap-2 overflow-y-auto pr-1">
            {programs.map((item) => (
              <Link
                key={item.id}
                href={`/app/programs/${item.id}`}
                className={cn(
                  "block rounded-md border p-3 transition",
                  item.id === program.id
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
                      {item.category.name} - {formatLevel(item.level)}
                    </p>
                  </div>
                  <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-[11px] font-semibold text-[#075bc9]">
                    {item._count.classes}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </aside>

        <div className="grid min-w-0 gap-6">
          <Link
            href="/app/programs"
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Programs
          </Link>

          <DetailCard icon={Pencil} title="Edit Program">
            <form action={updateProgram} className="grid gap-4">
              <input type="hidden" name="programId" value={program.id} />
              <input
                type="hidden"
                name="redirectTo"
                value={`${currentPath}?updated=1`}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <select
                  name="categoryId"
                  required
                  defaultValue={program.categoryId}
                  disabled={!canManagePrograms}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
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
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <select
                  name="level"
                  defaultValue={program.level ?? ""}
                  disabled={!canManagePrograms}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                >
                  <option value="">Tanpa level</option>
                  {Object.entries(programLevelLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  name="sessionDuration"
                  type="number"
                  min={1}
                  required
                  defaultValue={program.sessionDuration}
                  disabled={!canManagePrograms}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
                <input
                  name="totalSessions"
                  type="number"
                  min={1}
                  required
                  defaultValue={program.totalSessions}
                  disabled={!canManagePrograms}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
                <input
                  name="maxStudents"
                  type="number"
                  min={1}
                  required
                  defaultValue={program.maxStudents}
                  disabled={!canManagePrograms}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </div>
              <textarea
                name="description"
                rows={3}
                defaultValue={program.description ?? ""}
                disabled={!canManagePrograms}
                className="resize-none rounded-md border border-[#d7e0ea] bg-white px-3 py-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
              />
              <PendingButton
                disabled={!canManagePrograms}
                className="flex h-11 items-center justify-center rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                pendingChildren="Saving..."
              >
                Save Program
              </PendingButton>
            </form>
          </DetailCard>

          <DetailCard icon={BookOpen} title="Program Details">
            <div className="grid gap-6 md:grid-cols-3">
              <DetailField label="Name" value={program.name} />
              <DetailField label="Category" value={program.category.name} />
              <DetailField label="Level" value={formatLevel(program.level)} />
              <DetailField
                label="Duration"
                value={`${program.sessionDuration} menit`}
              />
              <DetailField label="Total Sesi" value={program.totalSessions} />
              <DetailField label="Max Student" value={program.maxStudents} />
              <DetailField
                label="Description"
                value={program.description ?? "-"}
              />
            </div>
          </DetailCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <DetailCard icon={CalendarDays} title="Classes">
              <div className="grid gap-3">
                {program.classes.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                    Belum ada class untuk program ini.
                  </div>
                ) : null}
                {program.classes.map((classItem) => (
                  <Link
                    key={classItem.id}
                    href={`/app/classes/${classItem.id}`}
                    className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3 transition hover:border-[#0b6ffb] hover:bg-[#eef5ff]"
                  >
                    <h3 className="truncate text-sm font-semibold">
                      {classItem.name}
                    </h3>
                    <p className="mt-1 text-xs text-[#6b7890]">
                      {classItem.teacher.name} - {classItem.academicPeriod.name}
                    </p>
                  </Link>
                ))}
              </div>
            </DetailCard>

            <DetailCard icon={Layers} title="Paket Harga">
              <div className="grid gap-3">
                {program.pricingPlans.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                    Belum ada paket untuk program ini.
                  </div>
                ) : null}
                {program.pricingPlans.map((pricingPlan) => (
                  <Link
                    key={pricingPlan.id}
                    href={`/app/packages/${pricingPlan.id}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3 transition hover:border-[#0b6ffb] hover:bg-[#eef5ff]"
                  >
                    <span className="truncate text-sm font-semibold">
                      {pricingPlan.name}
                    </span>
                    <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                      {formatCurrency(pricingPlan.price)}
                    </span>
                  </Link>
                ))}
              </div>
            </DetailCard>
          </div>
        </div>
      </div>
    </AppPageShell>
  );
}
