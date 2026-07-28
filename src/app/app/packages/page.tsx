import { BillingRule } from "@prisma/client";
import Link from "next/link";
import {
  CheckCircle2,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";

import { AppPageShell } from "@/app/app/app-page-shell";
import {
  createPackage,
  deletePackage,
  updatePackage,
} from "@/app/app/packages/actions";
import { PendingButton } from "@/components/pending-button";
import { requireWorkspaceContext } from "@/lib/organization";
import { formOptionLimit, pageListLimit } from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";

export const dynamic = "force-dynamic";

const billingRuleLabels = {
  MONTHLY: "Monthly",
  SEMESTER: "Semester",
  TRIAL: "Trial",
  PRIVATE: "Private",
} satisfies Record<BillingRule, string>;

const statusMessages = {
  created: "Paket harga berhasil ditambahkan.",
  deleted: "Paket harga berhasil dihapus.",
  updated: "Paket harga berhasil diperbarui.",
} as const;

const errorMessages = {
  name: "Nama paket minimal 2 karakter.",
  package: "Paket harga tidak ditemukan.",
  "package-data": "Harga dan billing rule wajib valid.",
  "package-has-invoices": "Paket harga sudah dipakai invoice.",
  permission: "Akun kamu belum bisa mengelola paket harga di organization ini.",
  program: "Program tidak ditemukan.",
} as const;

type PackagesSearchParams = {
  created?: string;
  deleted?: string;
  error?: keyof typeof errorMessages;
  updated?: string;
};

function statusKey(params: PackagesSearchParams) {
  return (["created", "updated", "deleted"] as const).find((key) => params[key]);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<PackagesSearchParams>;
}) {
  const params = await searchParams;
  const { organization, membership, organizations } =
    await requireWorkspaceContext("/app/packages");
  const canManagePackages = hasOrganizationPermission(
    membership,
    "billing.manage",
  );
  const activeStatus = statusKey(params);

  const [programs, packages] = await Promise.all([
    prisma.program.findMany({
      where: { organizationId: organization.id },
      include: { category: true },
      orderBy: { name: "asc" },
      take: formOptionLimit,
    }),
    prisma.pricingPlan.findMany({
      where: { organizationId: organization.id },
      include: {
        program: { include: { category: true } },
        _count: { select: { invoices: true } },
      },
      orderBy: { createdAt: "desc" },
      take: pageListLimit,
    }),
  ]);
  const canCreatePackage = canManagePackages && programs.length > 0;

  return (
    <AppPageShell
      activePath="/app/packages"
      activeRole={membership.customRole?.name ?? membership.role}
      eyebrow="Paket"
      organization={organization}
      organizations={organizations}
      title="Paket Harga"
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
              <h2 className="text-lg font-semibold">Tambah Paket</h2>
              <p className="mt-1 text-sm text-[#6b7890]">
                Paket menentukan harga yang nanti dipakai invoice dan
                enrollment.
              </p>
            </div>

            <form action={createPackage} className="grid gap-4 pt-5">
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Program</span>
                <select
                  name="programId"
                  required
                  disabled={!canCreatePackage}
                  defaultValue=""
                  className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                >
                  <option value="" disabled>
                    Pilih program
                  </option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name} - {program.category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Nama paket</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  disabled={!canCreatePackage}
                  placeholder="Bulanan"
                  className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Harga</span>
                  <input
                    name="price"
                    type="number"
                    min={0}
                    required
                    disabled={!canCreatePackage}
                    placeholder="450000"
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Billing rule</span>
                  <select
                    name="billingRule"
                    required
                    disabled={!canCreatePackage}
                    defaultValue="MONTHLY"
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  >
                    {Object.entries(billingRuleLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold text-[#536174]">
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked
                  disabled={!canCreatePackage}
                  className="size-4 rounded border-[#d7e0ea]"
                />
                Aktif
              </label>

              <PendingButton
                disabled={!canCreatePackage}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                pendingChildren="Menambahkan paket..."
              >
                <Plus className="size-4" aria-hidden="true" />
                Tambah Paket
              </PendingButton>
            </form>
          </section>

          <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-[#e6edf5] pb-5">
              <div>
                <h2 className="text-lg font-semibold">Paket Aktif</h2>
                <p className="mt-1 text-sm text-[#6b7890]">
                  {packages.length} paket harga di organization ini.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <details className="relative">
                  <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-md bg-[#0b6ffb] text-white transition hover:bg-[#075bc9] [&::-webkit-details-marker]:hidden">
                    <Plus className="size-5" aria-hidden="true" />
                    <span className="sr-only">Tambah paket</span>
                  </summary>
                  <div className="absolute right-0 z-30 mt-2 w-[min(520px,calc(100vw-2rem))] rounded-md border border-[#dfe6ef] bg-white p-5 shadow-xl">
                    <div className="border-b border-[#e6edf5] pb-4">
                      <h3 className="text-base font-semibold">Tambah Paket</h3>
                      <p className="mt-1 text-sm text-[#6b7890]">
                        Paket menentukan harga yang nanti dipakai invoice dan enrollment.
                      </p>
                    </div>
                    <form action={createPackage} className="grid gap-4 pt-5">
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold">Program</span>
                        <select
                          name="programId"
                          required
                          disabled={!canCreatePackage}
                          defaultValue=""
                          className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        >
                          <option value="" disabled>
                            Pilih program
                          </option>
                          {programs.map((program) => (
                            <option key={program.id} value={program.id}>
                              {program.name} - {program.category.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold">Nama paket</span>
                        <input
                          name="name"
                          required
                          minLength={2}
                          disabled={!canCreatePackage}
                          placeholder="Bulanan"
                          className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold">Harga</span>
                          <input
                            name="price"
                            type="number"
                            min={0}
                            required
                            disabled={!canCreatePackage}
                            placeholder="450000"
                            className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                        </label>
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold">Billing rule</span>
                          <select
                            name="billingRule"
                            required
                            disabled={!canCreatePackage}
                            defaultValue="MONTHLY"
                            className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            {Object.entries(billingRuleLabels).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                      </div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-[#536174]">
                        <input
                          name="isActive"
                          type="checkbox"
                          defaultChecked
                          disabled={!canCreatePackage}
                          className="size-4 rounded border-[#d7e0ea]"
                        />
                        Aktif
                      </label>
                      <PendingButton
                        disabled={!canCreatePackage}
                        className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                        pendingChildren="Menambahkan paket..."
                      >
                        <Plus className="size-4" aria-hidden="true" />
                        Tambah Paket
                      </PendingButton>
                    </form>
                  </div>
                </details>
                <ReceiptText className="size-5 text-[#0b6ffb]" aria-hidden="true" />
              </div>
            </div>

            <div className="grid gap-3 pt-5">
              {packages.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                  Belum ada paket harga.
                </div>
              ) : null}

              {packages.map((pricingPlan) => {
                const locked = pricingPlan._count.invoices > 0;

                return (
                <article
                  key={pricingPlan.id}
                  className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4 transition hover:border-[#0b6ffb] hover:bg-[#f8fbff]"
                >
                    <Link
                      href={`/app/packages/${pricingPlan.id}`}
                      className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold">
                            {pricingPlan.name}
                          </h3>
                          <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                            {billingRuleLabels[pricingPlan.billingRule]}
                          </span>
                          <span
                            className={
                              pricingPlan.isActive
                                ? "rounded-md bg-[#e7f8ef] px-2 py-1 text-xs font-semibold text-[#16834a]"
                                : "rounded-md bg-[#f1f5f9] px-2 py-1 text-xs font-semibold text-[#6b7890]"
                            }
                          >
                            {pricingPlan.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[#6b7890]">
                          {pricingPlan.program.name} -{" "}
                          {pricingPlan.program.category.name}
                        </p>
                      </div>
                      <div className="shrink-0 text-left sm:text-right">
                        <p className="text-lg font-semibold text-[#0b6ffb]">
                          {formatCurrency(pricingPlan.price)}
                        </p>
                        <p className="mt-1 text-xs text-[#6b7890]">
                          {pricingPlan._count.invoices} invoice
                        </p>
                      </div>
                    </Link>

                    <details className="mt-4 border-t border-[#e6edf5] pt-3">
                      <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#536174]">
                        <Pencil className="size-3.5" aria-hidden="true" />
                        Edit paket
                      </summary>
                      <form action={updatePackage} className="mt-3 grid gap-3">
                        <input
                          type="hidden"
                          name="packageId"
                          value={pricingPlan.id}
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <select
                            name="programId"
                            required
                            defaultValue={pricingPlan.programId}
                            disabled={!canManagePackages}
                            className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
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
                            className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <input
                            name="price"
                            type="number"
                            min={0}
                            required
                            defaultValue={pricingPlan.price}
                            disabled={!canManagePackages}
                            className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                          <select
                            name="billingRule"
                            required
                            defaultValue={pricingPlan.billingRule}
                            disabled={!canManagePackages}
                            className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            {Object.entries(billingRuleLabels).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
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
                          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9] disabled:cursor-wait disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          pendingChildren="Saving..."
                        >
                          Save Paket
                        </PendingButton>
                      </form>
                    </details>

                    <form action={deletePackage} className="mt-3">
                      <input
                        type="hidden"
                        name="packageId"
                        value={pricingPlan.id}
                      />
                      <PendingButton
                        disabled={!canManagePackages || locked}
                        className="flex h-9 items-center gap-2 rounded-md border border-[#f4c6c6] bg-white px-3 text-xs font-semibold text-[#c73535] transition hover:bg-[#fff4f4] disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:text-[#d8a4a4]"
                        pendingChildren="Deleting..."
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                        Delete Paket
                      </PendingButton>
                    </form>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </AppPageShell>
  );
}
