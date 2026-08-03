import {
  BillingAgreementStatus,
  BillingRule,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
} from "@prisma/client";
import Link from "next/link";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Download,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
  XCircle,
} from "lucide-react";

import { AppPageShell } from "@/app/app/app-page-shell";
import {
  createInvoice,
  createPayment,
  deleteInvoice,
  deletePayment,
  updateInvoice,
  voidInvoice,
} from "@/app/app/invoices/actions";
import { ListSearch } from "@/components/list-search";
import { PendingButton } from "@/components/pending-button";
import { requireWorkspaceContext } from "@/lib/organization";
import {
  formOptionLimit,
  normalizeSearchParam,
  pageListLimit,
} from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";

export const dynamic = "force-dynamic";

const invoiceStatusLabels = {
  DRAFT: "Draft",
  OVERDUE: "Overdue",
  PAID: "Paid",
  PARTIAL: "Partial",
  UNPAID: "Unpaid",
  VOID: "Void",
} satisfies Record<InvoiceStatus, string>;

const invoiceStatusClasses = {
  DRAFT: "bg-[#f1f5f9] text-[#6b7890]",
  OVERDUE: "bg-[#ffecec] text-[#c73535]",
  PAID: "bg-[#e7f8ef] text-[#16834a]",
  PARTIAL: "bg-[#fff3d8] text-[#a56600]",
  UNPAID: "bg-[#eaf2ff] text-[#075bc9]",
  VOID: "bg-[#f3eef7] text-[#7a4d95]",
} satisfies Record<InvoiceStatus, string>;

const paymentMethodLabels = {
  CASH: "Cash",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
} satisfies Record<PaymentMethod, string>;

const paymentStatusLabels = {
  CANCELLED: "Cancelled",
  CONFIRMED: "Confirmed",
  PENDING: "Pending",
} satisfies Record<PaymentStatus, string>;

const billingRuleLabels = {
  MONTHLY: "Bulanan",
  PRIVATE: "Private",
  SEMESTER: "Semester penuh",
  TRIAL: "Trial",
} satisfies Record<BillingRule, string>;

const billingAgreementStatusLabels = {
  ACTIVE: "Active",
  CANCELLED: "Cancelled",
  ENDED: "Ended",
} satisfies Record<BillingAgreementStatus, string>;

const statusMessages = {
  created: "Invoice berhasil dibuat.",
  deleted: "Invoice berhasil dihapus.",
  paymentCreated: "Payment berhasil dicatat.",
  paymentDeleted: "Payment berhasil dihapus.",
  updated: "Invoice berhasil diperbarui.",
  voided: "Invoice berhasil dibatalkan.",
} as const;

const errorMessages = {
  "billing-agreement": "Billing agreement tidak ditemukan atau belum lengkap.",
  enrollment: "Enrollment tidak ditemukan.",
  invoice: "Invoice tidak ditemukan.",
  "invoice-data":
    "Pilih billing agreement atau isi enrollment + paket harga, lalu pastikan status dan adjustment valid.",
  "invoice-dates": "Tanggal jatuh tempo harus setelah tanggal terbit.",
  "invoice-has-payments": "Invoice yang sudah punya payment tidak bisa dihapus.",
  "invoice-void": "Invoice void tidak bisa diubah atau dibayar.",
  package: "Paket harga tidak ditemukan.",
  "package-program": "Paket harga harus sesuai program class enrollment.",
  payment: "Payment tidak ditemukan.",
  "payment-data": "Nominal, method, dan status payment wajib valid.",
  permission: "Akun kamu belum bisa mengelola invoice di organization ini.",
  "registration-fee-duplicate":
    "Registration fee hanya bisa dikenakan satu kali untuk tiap student.",
} as const;

const registrationFeeDescription = "Registration Fee";

type InvoicesSearchParams = {
  created?: string;
  deleted?: string;
  error?: keyof typeof errorMessages;
  paymentCreated?: string;
  paymentDeleted?: string;
  q?: string;
  updated?: string;
  voided?: string;
};

function statusKey(params: InvoicesSearchParams) {
  return (
    [
      "created",
      "updated",
      "deleted",
      "paymentCreated",
      "paymentDeleted",
      "voided",
    ] as const
  ).find((key) => params[key]);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function toDateInputValue(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function formatDate(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(value)
    : "-";
}

function getRegistrationFeeAmount(
  lines: Array<{ description: string; total: number }>,
) {
  return (
    lines.find((line) => line.description === registrationFeeDescription)
      ?.total ?? 0
  );
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<InvoicesSearchParams>;
}) {
  const params = await searchParams;
  const { organization, membership, organizations } =
    await requireWorkspaceContext("/app/invoices");
  const canManageInvoices = hasOrganizationPermission(
    membership,
    "billing.manage",
  );
  const activeStatus = statusKey(params);
  const query = normalizeSearchParam(params.q);
  const invoiceWhere = {
    organizationId: organization.id,
    ...(query
      ? {
          OR: [
            {
              invoiceNumber: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              student: {
                name: { contains: query, mode: "insensitive" as const },
              },
            },
            {
              lines: {
                some: {
                  description: {
                    contains: query,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [enrollments, pricingPlans, billingAgreements, invoices] =
    await Promise.all([
    prisma.enrollment.findMany({
      where: { organizationId: organization.id },
      include: {
        academicPeriod: true,
        class: { include: { program: { include: { category: true } } } },
        student: true,
      },
      orderBy: { createdAt: "desc" },
      take: formOptionLimit,
    }),
    prisma.pricingPlan.findMany({
      where: { organizationId: organization.id, isActive: true },
      include: { program: { include: { category: true } } },
      orderBy: { name: "asc" },
      take: formOptionLimit,
    }),
    prisma.billingAgreement.findMany({
      where: { organizationId: organization.id },
      include: {
        enrollment: {
          include: {
            class: { include: { program: true } },
          },
        },
        pricingPlan: { include: { program: true } },
        student: true,
      },
      orderBy: [{ status: "asc" }, { startsAt: "desc" }],
      take: formOptionLimit,
    }),
    prisma.invoice.findMany({
      where: invoiceWhere,
      include: {
        academicPeriod: true,
        enrollment: {
          include: {
            class: { include: { program: true } },
          },
        },
        billingAgreement: true,
        lines: true,
        payments: { orderBy: { paidAt: "desc" } },
        pricingPlan: true,
        student: true,
        _count: { select: { payments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: pageListLimit,
    }),
  ]);
  const canCreateInvoice =
    canManageInvoices &&
    ((enrollments.length > 0 && pricingPlans.length > 0) ||
      billingAgreements.length > 0);

  return (
    <AppPageShell
      activePath="/app/invoices"
      activeRole={membership.customRole?.name ?? membership.role}
      eyebrow="Invoices"
      organization={organization}
      organizations={organizations}
      title="Invoice & Payment"
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

        <div className="grid min-w-0 gap-6">
          <section className="hidden min-w-0 rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="border-b border-[#e6edf5] pb-5">
              <h2 className="text-lg font-semibold">Buat Invoice</h2>
              <p className="mt-1 text-sm text-[#6b7890]">
                Invoice bisa dibuat manual dari enrollment + paket, atau dari
                billing agreement student.
              </p>
              <div className="mt-4 grid gap-2 text-xs leading-5 text-[#536174]">
                <div className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] px-3 py-2">
                  <span className="font-semibold text-[#172033]">Draft</span>{" "}
                  = invoice masih disiapkan, belum resmi ditagihkan.
                </div>
                <div className="rounded-md border border-[#dbe8fb] bg-[#eef5ff] px-3 py-2">
                  <span className="font-semibold text-[#172033]">Unpaid</span>{" "}
                  = invoice sudah diterbitkan, tapi payment belum masuk.
                </div>
              </div>
            </div>

            <form action={createInvoice} className="grid gap-4 pt-5">
              <label className="grid gap-2 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3">
                <span className="text-sm font-semibold">
                  Billing agreement
                </span>
                <select
                  name="billingAgreementId"
                  disabled={!canCreateInvoice}
                  defaultValue=""
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                >
                  <option value="">Manual tanpa agreement</option>
                  {billingAgreements.map((agreement) => (
                    <option key={agreement.id} value={agreement.id}>
                      {agreement.student.name} -{" "}
                      {agreement.enrollment?.class.name ?? "Tanpa class"} -{" "}
                      {billingRuleLabels[agreement.billingRule]} -{" "}
                      {formatCurrency(agreement.amount)} (
                      {billingAgreementStatusLabels[agreement.status]})
                    </option>
                  ))}
                </select>
                <span className="text-xs leading-5 text-[#6b7890]">
                  Kalau dipilih, enrollment, paket, dan nominal invoice akan
                  mengikuti agreement tersebut.
                </span>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Enrollment</span>
                <select
                  name="enrollmentId"
                  disabled={!canCreateInvoice}
                  defaultValue=""
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                >
                  <option value="" disabled>
                    Pilih enrollment
                  </option>
                  {enrollments.map((enrollment) => (
                    <option key={enrollment.id} value={enrollment.id}>
                      {enrollment.student.name} - {enrollment.class.name} -{" "}
                      {enrollment.academicPeriod.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Paket harga</span>
                <select
                  name="pricingPlanId"
                  disabled={!canCreateInvoice}
                  defaultValue=""
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                >
                  <option value="" disabled>
                    Pilih paket
                  </option>
                  {pricingPlans.map((pricingPlan) => (
                    <option key={pricingPlan.id} value={pricingPlan.id}>
                      {pricingPlan.program.name} - {pricingPlan.name} -{" "}
                      {formatCurrency(pricingPlan.price)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Status</span>
                  <select
                    name="status"
                    required
                    disabled={!canCreateInvoice}
                    defaultValue="UNPAID"
                    className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  >
                    {(["DRAFT", "UNPAID"] as const).map((status) => (
                      <option key={status} value={status}>
                        {invoiceStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Adjustment</span>
                  <input
                    name="adjustmentAmount"
                    type="number"
                    defaultValue={0}
                    disabled={!canCreateInvoice}
                    className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>
              </div>

              <label className="grid gap-2 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3">
                <span className="text-sm font-semibold">
                  Registration fee sekali per student
                </span>
                <input
                  name="registrationFeeAmount"
                  type="number"
                  min={0}
                  defaultValue={0}
                  disabled={!canCreateInvoice}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
                <span className="text-xs leading-5 text-[#6b7890]">
                  Isi kalau student baru perlu dikenakan biaya pendaftaran.
                  Sistem akan menolak duplikasi untuk student yang sama.
                </span>
              </label>

              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Tanggal terbit</span>
                  <input
                    name="issuedAt"
                    type="date"
                    disabled={!canCreateInvoice}
                    className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Jatuh tempo</span>
                  <input
                    name="dueAt"
                    type="date"
                    disabled={!canCreateInvoice}
                    className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  />
                </label>
              </div>

              <PendingButton
                disabled={!canCreateInvoice}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                pendingChildren="Membuat invoice..."
              >
                <Plus className="size-4" aria-hidden="true" />
                Buat Invoice
              </PendingButton>
            </form>

            <div className="mt-6 grid gap-2 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4 text-xs text-[#6b7890] sm:grid-cols-2">
              <span>{enrollments.length} enrollment tersedia</span>
              <span>{pricingPlans.length} paket aktif tersedia</span>
              <span>{billingAgreements.length} agreement tersedia</span>
            </div>
          </section>

          <section className="min-w-0 rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#e6edf5] pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">Invoice Terbaru</h2>
                <p className="mt-1 text-sm text-[#6b7890]">
                  Menampilkan {invoices.length} invoice terbaru
                  {query ? ` untuk "${query}"` : ""}.
                </p>
              </div>
              <ReceiptText className="size-5 text-[#0b6ffb]" aria-hidden="true" />
            </div>
            <ListSearch
              clearHref="/app/invoices"
              placeholder="Cari invoice, student, atau item"
              query={query}
            />

            <div className="grid gap-3 pt-5">
              {invoices.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                  Belum ada invoice.
                </div>
              ) : null}

              {invoices.map((invoice) => {
                const paid = invoice.payments
                  .filter((payment) => payment.status === "CONFIRMED")
                  .reduce((total, payment) => total + payment.amount, 0);
                const balance = Math.max(invoice.total - paid, 0);
                const locked = invoice.status === "VOID";
                const registrationFeeAmount = getRegistrationFeeAmount(
                  invoice.lines,
                );

                return (
                  <article
                    key={invoice.id}
                    className="min-w-0 overflow-hidden rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4 transition hover:border-[#0b6ffb] hover:bg-[#f8fbff]"
                  >
                    <Link
                      href={`/app/invoices/${invoice.id}`}
                      className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="max-w-full truncate text-sm font-semibold">
                            {invoice.invoiceNumber}
                          </h3>
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-semibold ${invoiceStatusClasses[invoice.status]}`}
                          >
                            {invoiceStatusLabels[invoice.status]}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[#6b7890]">
                          {invoice.student.name} -{" "}
                          {invoice.enrollment?.class.program.name ??
                            invoice.pricingPlan?.name ??
                            "Manual"}
                        </p>
                        {invoice.billingAgreement ? (
                          <p className="mt-1 text-xs font-semibold text-[#0b6ffb]">
                            Dari agreement{" "}
                            {billingRuleLabels[
                              invoice.billingAgreement.billingRule
                            ]}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-[#536174]">
                          Terbit {formatDate(invoice.issuedAt)} | Due{" "}
                          {formatDate(invoice.dueAt)}
                        </p>
                      </div>
                      <div className="shrink-0 text-left lg:text-right">
                        <p className="text-lg font-semibold text-[#0b6ffb]">
                          {formatCurrency(invoice.total)}
                        </p>
                        <p className="mt-1 text-xs text-[#6b7890]">
                          Paid {formatCurrency(paid)} | Sisa{" "}
                          {formatCurrency(balance)}
                        </p>
                      </div>
                    </Link>

                    <a
                      href={`/app/invoices/${invoice.id}/pdf`}
                      className="mt-3 inline-flex h-8 items-center gap-1 rounded-md border border-[#d7e0ea] bg-white px-2 text-xs font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
                    >
                      <Download className="size-3.5" aria-hidden="true" />
                      PDF
                    </a>

                    <details className="mt-4 border-t border-[#e6edf5] pt-3">
                      <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#536174]">
                        <Pencil className="size-3.5" aria-hidden="true" />
                        Edit invoice
                      </summary>
                      <form action={updateInvoice} className="mt-3 grid min-w-0 gap-3">
                        <input
                          type="hidden"
                          name="invoiceId"
                          value={invoice.id}
                        />
                        <div className="grid min-w-0 gap-3 md:grid-cols-2">
                          <select
                            name="billingAgreementId"
                            defaultValue={invoice.billingAgreementId ?? ""}
                            disabled={!canManageInvoices || locked}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            <option value="">Manual tanpa agreement</option>
                            {billingAgreements.map((agreement) => (
                              <option key={agreement.id} value={agreement.id}>
                                {agreement.student.name} -{" "}
                                {agreement.enrollment?.class.name ??
                                  "Tanpa class"}{" "}
                                - {billingRuleLabels[agreement.billingRule]} -{" "}
                                {formatCurrency(agreement.amount)}
                              </option>
                            ))}
                          </select>
                          <select
                            name="enrollmentId"
                            defaultValue={invoice.enrollmentId ?? ""}
                            disabled={!canManageInvoices || locked}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            {enrollments.map((enrollment) => (
                              <option key={enrollment.id} value={enrollment.id}>
                                {enrollment.student.name} -{" "}
                                {enrollment.class.name}
                              </option>
                            ))}
                          </select>
                          <select
                            name="pricingPlanId"
                            defaultValue={invoice.pricingPlanId ?? ""}
                            disabled={!canManageInvoices || locked}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            {pricingPlans.map((pricingPlan) => (
                              <option key={pricingPlan.id} value={pricingPlan.id}>
                                {pricingPlan.program.name} - {pricingPlan.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <select
                            name="status"
                            required
                            defaultValue={invoice.status}
                            disabled={!canManageInvoices || locked}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            {(["DRAFT", "UNPAID", "OVERDUE"] as const).map(
                              (status) => (
                                <option key={status} value={status}>
                                  {invoiceStatusLabels[status]}
                                </option>
                              ),
                            )}
                          </select>
                          <input
                            name="adjustmentAmount"
                            type="number"
                            defaultValue={invoice.adjustmentAmount}
                            disabled={!canManageInvoices || locked}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                          <input
                            name="issuedAt"
                            type="date"
                            defaultValue={toDateInputValue(invoice.issuedAt)}
                            disabled={!canManageInvoices || locked}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                          <input
                            name="dueAt"
                            type="date"
                            defaultValue={toDateInputValue(invoice.dueAt)}
                            disabled={!canManageInvoices || locked}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                        </div>
                        <label className="grid gap-2 rounded-md border border-[#e6edf5] bg-white p-3">
                          <span className="text-xs font-semibold text-[#536174]">
                            Registration fee one-time
                          </span>
                          <input
                            name="registrationFeeAmount"
                            type="number"
                            min={0}
                            defaultValue={registrationFeeAmount}
                            disabled={!canManageInvoices || locked}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                        </label>
                        <PendingButton
                          disabled={!canManageInvoices || locked}
                          className="flex h-10 w-full items-center justify-center rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9] disabled:cursor-wait disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          pendingChildren="Saving..."
                        >
                          Save Invoice
                        </PendingButton>
                      </form>
                    </details>

                    <details className="mt-3 border-t border-[#e6edf5] pt-3">
                      <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#536174]">
                        <CreditCard className="size-3.5" aria-hidden="true" />
                        Payment
                      </summary>
                      <form action={createPayment} className="mt-3 grid min-w-0 gap-3">
                        <input
                          type="hidden"
                          name="invoiceId"
                          value={invoice.id}
                        />
                        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <input
                            name="amount"
                            type="number"
                            min={1}
                            required
                            disabled={!canManageInvoices || locked}
                            placeholder="Amount"
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                          <select
                            name="method"
                            required
                            defaultValue="TRANSFER"
                            disabled={!canManageInvoices || locked}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            {Object.entries(paymentMethodLabels).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                          <select
                            name="status"
                            required
                            defaultValue="CONFIRMED"
                            disabled={!canManageInvoices || locked}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          >
                            {Object.entries(paymentStatusLabels).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                          <input
                            name="paidAt"
                            type="date"
                            disabled={!canManageInvoices || locked}
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                        </div>
                        <div className="grid min-w-0 gap-3 md:grid-cols-2">
                          <input
                            name="reference"
                            disabled={!canManageInvoices || locked}
                            placeholder="Reference"
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                          <input
                            name="notes"
                            disabled={!canManageInvoices || locked}
                            placeholder="Notes"
                            className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          />
                        </div>
                        <PendingButton
                          disabled={!canManageInvoices || locked}
                          className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                          pendingChildren="Recording..."
                        >
                          <Banknote className="size-4" aria-hidden="true" />
                          Record Payment
                        </PendingButton>
                      </form>

                      <div className="mt-3 grid gap-2">
                        {invoice.payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between gap-3 rounded-md border border-[#e6edf5] bg-white px-3 py-2 text-xs"
                          >
                            <span className="min-w-0 truncate">
                              {paymentMethodLabels[payment.method]} -{" "}
                              {formatCurrency(payment.amount)} -{" "}
                              {paymentStatusLabels[payment.status]}
                            </span>
                            <form action={deletePayment}>
                              <input
                                type="hidden"
                                name="paymentId"
                                value={payment.id}
                              />
                              <PendingButton
                                disabled={!canManageInvoices || locked}
                                className="rounded-md border border-[#f4c6c6] px-2 py-1 font-semibold text-[#c73535] disabled:cursor-not-allowed disabled:text-[#d8a4a4]"
                                pendingChildren="Deleting..."
                              >
                                Delete
                              </PendingButton>
                            </form>
                          </div>
                        ))}
                      </div>
                    </details>

                    <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
                      <form action={voidInvoice} className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <input
                          type="hidden"
                          name="invoiceId"
                          value={invoice.id}
                        />
                        <input
                          name="voidReason"
                          disabled={!canManageInvoices || locked}
                          placeholder="Void reason"
                          className="h-9 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-xs outline-none focus:border-[#0b6ffb] disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        />
                        <PendingButton
                          disabled={!canManageInvoices || locked}
                          className="flex h-9 items-center justify-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-xs font-semibold text-[#536174] transition hover:bg-[#f1f5f9] disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          pendingChildren="Voiding..."
                        >
                          <XCircle className="size-3.5" aria-hidden="true" />
                          Void
                        </PendingButton>
                      </form>

                      <form action={deleteInvoice} className="min-w-0">
                        <input
                          type="hidden"
                          name="invoiceId"
                          value={invoice.id}
                        />
                        <PendingButton
                          disabled={
                            !canManageInvoices || invoice._count.payments > 0
                          }
                          className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[#f4c6c6] bg-white px-3 text-xs font-semibold text-[#c73535] transition hover:bg-[#fff4f4] disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:text-[#d8a4a4]"
                          pendingChildren="Deleting..."
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          Delete Invoice
                        </PendingButton>
                      </form>
                    </div>
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
