import { BillingRule } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CreditCard, Pencil, ReceiptText } from "lucide-react";

import { AppPageShell } from "@/app/app/app-page-shell";
import { updatePackage } from "@/app/app/packages/actions";
import { DetailCard, DetailField } from "@/components/detail-card";
import { PendingButton } from "@/components/pending-button";
import { requireWorkspaceContext } from "@/lib/organization";
import { formOptionLimit, pageListLimit } from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const billingRuleLabels = {
  MONTHLY: "Monthly",
  SEMESTER: "Semester",
  TRIAL: "Trial",
  PRIVATE: "Private",
} satisfies Record<BillingRule, string>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ packageId: string }>;
}) {
  const { packageId } = await params;
  const { organization, membership, organizations } =
    await requireWorkspaceContext(`/app/packages/${packageId}`);
  const canManagePackages = hasOrganizationPermission(
    membership,
    "billing.manage",
  );

  const [pricingPlan, packages, programs] = await Promise.all([
    prisma.pricingPlan.findFirst({
      where: { id: packageId, organizationId: organization.id },
      include: {
        invoices: {
          include: { payments: true, student: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        program: { include: { category: true } },
      },
    }),
    prisma.pricingPlan.findMany({
      where: { organizationId: organization.id },
      include: {
        program: { include: { category: true } },
        _count: { select: { invoices: true } },
      },
      orderBy: { name: "asc" },
      take: pageListLimit,
    }),
    prisma.program.findMany({
      where: { organizationId: organization.id },
      include: { category: true },
      orderBy: { name: "asc" },
      take: formOptionLimit,
    }),
  ]);

  if (!pricingPlan) {
    notFound();
  }

  const currentPath = `/app/packages/${pricingPlan.id}`;

  return (
    <AppPageShell
      activePath="/app/packages"
      activeRole={membership.customRole?.name ?? membership.role}
      eyebrow="Paket Detail"
      organization={organization}
      organizations={organizations}
      title={pricingPlan.name}
    >
      <div className="mx-auto grid max-w-[1500px] gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-md border border-[#dfe6ef] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#e6edf5] pb-4">
            <div>
              <h2 className="text-lg font-semibold">Paket</h2>
              <p className="mt-1 text-xs text-[#6b7890]">
                {packages.length} paket dibuat
              </p>
            </div>
            <Link
              href="/app/packages"
              className="grid size-10 place-items-center rounded-md border border-[#d7e0ea] text-[#536174] transition hover:bg-[#f1f5f9]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span className="sr-only">Back</span>
            </Link>
          </div>

          <div className="mt-4 grid max-h-[760px] gap-2 overflow-y-auto pr-1">
            {packages.map((item) => (
              <Link
                key={item.id}
                href={`/app/packages/${item.id}`}
                className={cn(
                  "block rounded-md border p-3 transition",
                  item.id === pricingPlan.id
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
                      {item.program.name}
                    </p>
                  </div>
                  <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-[11px] font-semibold text-[#075bc9]">
                    {item._count.invoices}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </aside>

        <div className="grid min-w-0 gap-6">
          <Link
            href="/app/packages"
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Paket
          </Link>

          <DetailCard icon={Pencil} title="Edit Paket">
            <form action={updatePackage} className="grid gap-4">
              <input type="hidden" name="packageId" value={pricingPlan.id} />
              <input
                type="hidden"
                name="redirectTo"
                value={`${currentPath}?updated=1`}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <select
                  name="programId"
                  required
                  defaultValue={pricingPlan.programId}
                  disabled={!canManagePackages}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                >
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name} - {program.category.name}
                    </option>
                  ))}
                </select>
                <input
                  name="name"
                  required
                  minLength={2}
                  defaultValue={pricingPlan.name}
                  disabled={!canManagePackages}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  name="price"
                  type="number"
                  min={0}
                  required
                  defaultValue={pricingPlan.price}
                  disabled={!canManagePackages}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
                <select
                  name="billingRule"
                  required
                  defaultValue={pricingPlan.billingRule}
                  disabled={!canManagePackages}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                >
                  {Object.entries(billingRuleLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#536174]">
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked={pricingPlan.isActive}
                  disabled={!canManagePackages}
                  className="size-4 rounded border-[#d7e0ea]"
                />
                Aktif
              </label>
              <PendingButton
                disabled={!canManagePackages}
                className="flex h-11 items-center justify-center rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                pendingChildren="Saving..."
              >
                Save Paket
              </PendingButton>
            </form>
          </DetailCard>

          <DetailCard icon={ReceiptText} title="Paket Details">
            <div className="grid gap-6 md:grid-cols-3">
              <DetailField label="Name" value={pricingPlan.name} />
              <DetailField label="Program" value={pricingPlan.program.name} />
              <DetailField
                label="Category"
                value={pricingPlan.program.category.name}
              />
              <DetailField
                label="Billing Rule"
                value={billingRuleLabels[pricingPlan.billingRule]}
              />
              <DetailField label="Price" value={formatCurrency(pricingPlan.price)} />
              <DetailField
                label="Status"
                value={pricingPlan.isActive ? "Aktif" : "Nonaktif"}
              />
            </div>
          </DetailCard>

          <DetailCard icon={CreditCard} title="Invoices">
            <div className="grid gap-3">
              {pricingPlan.invoices.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                  Belum ada invoice dari paket ini.
                </div>
              ) : null}
              {pricingPlan.invoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/app/invoices/${invoice.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3 transition hover:border-[#0b6ffb] hover:bg-[#eef5ff]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {invoice.invoiceNumber}
                    </span>
                    <span className="block truncate text-xs text-[#6b7890]">
                      {invoice.student.name}
                    </span>
                  </span>
                  <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                    {formatCurrency(invoice.total)}
                  </span>
                </Link>
              ))}
            </div>
          </DetailCard>
        </div>
      </div>
    </AppPageShell>
  );
}
