import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Pencil,
  Phone,
  UserCircle,
  Users,
} from "lucide-react";

import { AppPageShell } from "@/app/app/app-page-shell";
import { updateParent } from "@/app/app/parents/actions";
import { DetailCard, DetailField } from "@/components/detail-card";
import { PendingButton } from "@/components/pending-button";
import { requireWorkspaceContext } from "@/lib/organization";
import { pageListLimit } from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ParentDetailPage({
  params,
}: {
  params: Promise<{ parentId: string }>;
}) {
  const { parentId } = await params;
  const { organization, membership, organizations } =
    await requireWorkspaceContext(`/app/parents/${parentId}`);
  const canManageParents = hasOrganizationPermission(
    membership,
    "students.manage",
  );

  const [parent, parents] = await Promise.all([
    prisma.parent.findFirst({
      where: { id: parentId, organizationId: organization.id },
      include: {
        students: {
          include: {
            _count: { select: { enrollments: true, invoices: true } },
          },
          orderBy: { name: "asc" },
        },
      },
    }),
    prisma.parent.findMany({
      where: { organizationId: organization.id },
      include: { _count: { select: { students: true } } },
      orderBy: { name: "asc" },
      take: pageListLimit,
    }),
  ]);

  if (!parent) {
    notFound();
  }

  const currentPath = `/app/parents/${parent.id}`;

  return (
    <AppPageShell
      activePath="/app/parents"
      activeRole={membership.customRole?.name ?? membership.role}
      eyebrow="Parent Detail"
      organization={organization}
      organizations={organizations}
      title={parent.name}
    >
      <div className="mx-auto grid max-w-[1500px] gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-md border border-[#dfe6ef] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#e6edf5] pb-4">
            <div>
              <h2 className="text-lg font-semibold">Parents</h2>
              <p className="mt-1 text-xs text-[#6b7890]">
                {parents.length} parent dibuat
              </p>
            </div>
            <Link
              href="/app/parents"
              className="grid size-10 place-items-center rounded-md border border-[#d7e0ea] text-[#536174] transition hover:bg-[#f1f5f9]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span className="sr-only">Back</span>
            </Link>
          </div>

          <div className="mt-4 grid max-h-[760px] gap-2 overflow-y-auto pr-1">
            {parents.map((item) => (
              <Link
                key={item.id}
                href={`/app/parents/${item.id}`}
                className={cn(
                  "block rounded-md border p-3 transition",
                  item.id === parent.id
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
                    {item._count.students}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </aside>

        <div className="grid min-w-0 gap-6">
          <Link
            href="/app/parents"
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Parents
          </Link>

          <DetailCard icon={UserCircle} title="Parent Summary">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="grid size-28 shrink-0 place-items-center rounded-md border border-[#d7e0ea] bg-[#eaf2ff] text-[#075bc9]">
                <UserCircle className="size-16" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-semibold">
                  {parent.name}
                </h2>
                <p className="mt-2 text-sm text-[#6b7890]">
                  {parent.phone || parent.email || "Kontak belum diisi"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-md bg-[#eaf2ff] px-3 py-1 text-sm font-semibold text-[#075bc9]">
                    {parent.students.length} student
                  </span>
                  <span className="rounded-md bg-[#f1f5f9] px-3 py-1 text-sm font-semibold text-[#536174]">
                    Parent
                  </span>
                </div>
              </div>
            </div>
          </DetailCard>

          <DetailCard icon={Pencil} title="Edit Parent">
            <form action={updateParent} className="grid gap-4">
              <input type="hidden" name="parentId" value={parent.id} />
              <input
                type="hidden"
                name="redirectTo"
                value={`${currentPath}?updated=1`}
              />
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Nama parent</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  defaultValue={parent.name}
                  disabled={!canManageParents}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Phone</span>
                  <input
                    name="phone"
                    defaultValue={parent.phone ?? ""}
                    disabled={!canManageParents}
                    className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Email</span>
                  <input
                    name="email"
                    type="email"
                    defaultValue={parent.email ?? ""}
                    disabled={!canManageParents}
                    className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Alamat</span>
                <textarea
                  name="address"
                  rows={4}
                  defaultValue={parent.address ?? ""}
                  disabled={!canManageParents}
                  className="resize-none rounded-md border border-[#d7e0ea] bg-white px-3 py-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </label>
              <PendingButton
                disabled={!canManageParents}
                className="flex h-11 items-center justify-center rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                pendingChildren="Saving..."
              >
                Save Parent
              </PendingButton>
            </form>
          </DetailCard>

          <DetailCard icon={UserCircle} title="Parent Details">
            <div className="grid gap-6 md:grid-cols-3">
              <DetailField label="Name" value={parent.name} />
              <DetailField label="Phone" value={parent.phone ?? "-"} />
              <DetailField label="Email" value={parent.email ?? "-"} />
              <DetailField label="Address" value={parent.address ?? "-"} />
              <DetailField label="Students" value={parent.students.length} />
            </div>
          </DetailCard>

          <DetailCard icon={Users} title="Students">
            <div className="grid gap-3">
              {parent.students.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                  Belum ada student untuk parent ini.
                </div>
              ) : null}
              {parent.students.map((student) => (
                <Link
                  key={student.id}
                  href={`/app/students/${student.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3 transition hover:border-[#0b6ffb] hover:bg-[#eef5ff]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <UserCircle className="size-5 shrink-0 text-[#0b6ffb]" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {student.name}
                      </span>
                      <span className="block truncate text-xs text-[#6b7890]">
                        {student.phone || student.notes || "No notes"}
                      </span>
                    </span>
                  </span>
                  <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                    {student._count.enrollments} enrollment
                  </span>
                </Link>
              ))}
            </div>
          </DetailCard>

          <DetailCard icon={Phone} title="Contact">
            <div className="grid gap-6 md:grid-cols-3">
              <DetailField
                label="Call"
                value={
                  parent.phone ? (
                    <a
                      href={`tel:${parent.phone}`}
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-[#0b6ffb] px-3 text-xs font-semibold text-white"
                    >
                      <Phone className="size-4" />
                      {parent.phone}
                    </a>
                  ) : (
                    "-"
                  )
                }
              />
              <DetailField
                label="Email"
                value={
                  parent.email ? (
                    <a
                      href={`mailto:${parent.email}`}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-xs font-semibold text-[#536174]"
                    >
                      <Mail className="size-4" />
                      {parent.email}
                    </a>
                  ) : (
                    "-"
                  )
                }
              />
              <DetailField
                label="Location"
                value={
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="size-4 text-[#0b6ffb]" />
                    {parent.address || "-"}
                  </span>
                }
              />
            </div>
          </DetailCard>
        </div>
      </div>
    </AppPageShell>
  );
}
