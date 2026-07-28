import {
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
} from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Download,
  Pencil,
  ReceiptText,
  XCircle,
} from "lucide-react";

import { AppPageShell } from "@/app/app/app-page-shell";
import {
  createPayment,
  updateInvoice,
  voidInvoice,
} from "@/app/app/invoices/actions";
import { DetailCard, DetailField } from "@/components/detail-card";
import { PendingButton } from "@/components/pending-button";
import { requireWorkspaceContext } from "@/lib/organization";
import { formOptionLimit, pageListLimit } from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const invoiceStatusLabels = {
  DRAFT: "Draft",
  OVERDUE: "Overdue",
  PAID: "Paid",
  PARTIAL: "Partial",
  UNPAID: "Unpaid",
  VOID: "Void",
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

const registrationFeeDescription = "Registration Fee";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
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

function toDateInputValue(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function registrationFee(lines: Array<{ description: string; total: number }>) {
  return (
    lines.find((line) => line.description === registrationFeeDescription)
      ?.total ?? 0
  );
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const { organization, membership, organizations } =
    await requireWorkspaceContext(`/app/invoices/${invoiceId}`);
  const canManageInvoices = hasOrganizationPermission(
    membership,
    "billing.manage",
  );

  const [invoice, invoices, enrollments, pricingPlans] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: organization.id },
      include: {
        academicPeriod: true,
        enrollment: { include: { class: { include: { program: true } } } },
        lines: true,
        payments: { orderBy: { paidAt: "desc" } },
        pricingPlan: true,
        student: true,
      },
    }),
    prisma.invoice.findMany({
      where: { organizationId: organization.id },
      include: { student: true },
      orderBy: { createdAt: "desc" },
      take: pageListLimit,
    }),
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
  ]);

  if (!invoice) {
    notFound();
  }

  const paid = invoice.payments
    .filter((payment) => payment.status === "CONFIRMED")
    .reduce((total, payment) => total + payment.amount, 0);
  const balance = Math.max(invoice.total - paid, 0);
  const locked = invoice.status === "VOID";
  const currentPath = `/app/invoices/${invoice.id}`;

  return (
    <AppPageShell
      activePath="/app/invoices"
      activeRole={membership.customRole?.name ?? membership.role}
      eyebrow="Invoice Detail"
      organization={organization}
      organizations={organizations}
      title={invoice.invoiceNumber}
    >
      <div className="mx-auto grid max-w-[1500px] gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-md border border-[#dfe6ef] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#e6edf5] pb-4">
            <div>
              <h2 className="text-lg font-semibold">Invoices</h2>
              <p className="mt-1 text-xs text-[#6b7890]">
                {invoices.length} invoice terbaru
              </p>
            </div>
            <Link
              href="/app/invoices"
              className="grid size-10 place-items-center rounded-md border border-[#d7e0ea] text-[#536174] transition hover:bg-[#f1f5f9]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span className="sr-only">Back</span>
            </Link>
          </div>

          <div className="mt-4 grid max-h-[760px] gap-2 overflow-y-auto pr-1">
            {invoices.map((item) => (
              <Link
                key={item.id}
                href={`/app/invoices/${item.id}`}
                className={cn(
                  "block rounded-md border p-3 transition",
                  item.id === invoice.id
                    ? "border-[#cfe0ff] bg-[#eaf8fc]"
                    : "border-[#e6edf5] bg-[#fbfcfe] hover:border-[#0b6ffb] hover:bg-[#eef5ff]",
                )}
              >
                <h3 className="truncate text-sm font-semibold">
                  {item.invoiceNumber}
                </h3>
                <p className="mt-1 truncate text-xs text-[#6b7890]">
                  {item.student.name}
                </p>
                <p className="mt-2 text-xs font-semibold text-[#0b6ffb]">
                  {formatCurrency(item.total)}
                </p>
              </Link>
            ))}
          </div>
        </aside>

        <div className="grid min-w-0 gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/app/invoices"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Invoices
            </Link>
            <a
              href={`/app/invoices/${invoice.id}/pdf`}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9]"
            >
              <Download className="size-4" aria-hidden="true" />
              Download PDF
            </a>
          </div>

          <DetailCard icon={ReceiptText} title="Invoice Details">
            <div className="grid gap-6 md:grid-cols-3">
              <DetailField label="Invoice No" value={invoice.invoiceNumber} />
              <DetailField label="Student" value={invoice.student.name} />
              <DetailField label="Status" value={invoiceStatusLabels[invoice.status]} />
              <DetailField label="Issued" value={formatDate(invoice.issuedAt)} />
              <DetailField label="Due" value={formatDate(invoice.dueAt)} />
              <DetailField label="Period" value={invoice.academicPeriod?.name ?? "-"} />
              <DetailField label="Subtotal" value={formatCurrency(invoice.subtotal)} />
              <DetailField
                label="Adjustment"
                value={formatCurrency(invoice.adjustmentAmount)}
              />
              <DetailField label="Total" value={formatCurrency(invoice.total)} />
              <DetailField label="Paid" value={formatCurrency(paid)} />
              <DetailField label="Balance" value={formatCurrency(balance)} />
              <DetailField
                label="Void Reason"
                value={invoice.voidReason ?? "-"}
              />
            </div>
          </DetailCard>

          <DetailCard icon={Pencil} title="Edit Invoice">
            <form action={updateInvoice} className="grid min-w-0 gap-4">
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <input
                type="hidden"
                name="redirectTo"
                value={`${currentPath}?updated=1`}
              />
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <select
                  name="enrollmentId"
                  required
                  defaultValue={invoice.enrollmentId ?? ""}
                  disabled={!canManageInvoices || locked}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                >
                  {enrollments.map((enrollment) => (
                    <option key={enrollment.id} value={enrollment.id}>
                      {enrollment.student.name} - {enrollment.class.name}
                    </option>
                  ))}
                </select>
                <select
                  name="pricingPlanId"
                  required
                  defaultValue={invoice.pricingPlanId ?? ""}
                  disabled={!canManageInvoices || locked}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                >
                  {pricingPlans.map((pricingPlan) => (
                    <option key={pricingPlan.id} value={pricingPlan.id}>
                      {pricingPlan.program.name} - {pricingPlan.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid min-w-0 gap-4 md:grid-cols-4">
                <select
                  name="status"
                  required
                  defaultValue={invoice.status}
                  disabled={!canManageInvoices || locked}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                >
                  {(["DRAFT", "UNPAID", "OVERDUE"] as const).map((status) => (
                    <option key={status} value={status}>
                      {invoiceStatusLabels[status]}
                    </option>
                  ))}
                </select>
                <input
                  name="adjustmentAmount"
                  type="number"
                  defaultValue={invoice.adjustmentAmount}
                  disabled={!canManageInvoices || locked}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
                <input
                  name="issuedAt"
                  type="date"
                  defaultValue={toDateInputValue(invoice.issuedAt)}
                  disabled={!canManageInvoices || locked}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
                <input
                  name="dueAt"
                  type="date"
                  defaultValue={toDateInputValue(invoice.dueAt)}
                  disabled={!canManageInvoices || locked}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </div>
              <label className="grid gap-2 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3">
                <span className="text-sm font-semibold">
                  Registration fee one-time
                </span>
                <input
                  name="registrationFeeAmount"
                  type="number"
                  min={0}
                  defaultValue={registrationFee(invoice.lines)}
                  disabled={!canManageInvoices || locked}
                  className="h-11 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </label>
              <PendingButton
                disabled={!canManageInvoices || locked}
                className="flex h-11 items-center justify-center rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#b9c7d8]"
                pendingChildren="Saving..."
              >
                Save Invoice
              </PendingButton>
            </form>
          </DetailCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <DetailCard icon={CreditCard} title="Payment">
              <form action={createPayment} className="grid min-w-0 gap-3">
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <input
                  type="hidden"
                  name="redirectTo"
                  value={`${currentPath}?paymentCreated=1`}
                />
                <div className="grid gap-3 md:grid-cols-2">
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
                    {Object.entries(paymentMethodLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    name="status"
                    required
                    defaultValue="CONFIRMED"
                    disabled={!canManageInvoices || locked}
                    className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  >
                    {Object.entries(paymentStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    name="paidAt"
                    type="date"
                    disabled={!canManageInvoices || locked}
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
            </DetailCard>

            <DetailCard icon={XCircle} title="Void Invoice">
              <form action={voidInvoice} className="grid gap-3">
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <input
                  type="hidden"
                  name="redirectTo"
                  value={`${currentPath}?voided=1`}
                />
                <input
                  name="voidReason"
                  disabled={!canManageInvoices || locked}
                  placeholder="Void reason"
                  className="h-10 w-full min-w-0 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
                <PendingButton
                  disabled={!canManageInvoices || locked}
                  className="flex h-10 items-center justify-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9] disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  pendingChildren="Voiding..."
                >
                  <XCircle className="size-4" aria-hidden="true" />
                  Void
                </PendingButton>
              </form>
            </DetailCard>
          </div>

          <DetailCard icon={Banknote} title="Payments">
            <div className="grid gap-3">
              {invoice.payments.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#d7e0ea] p-5 text-center text-sm text-[#6b7890]">
                  Belum ada payment.
                </div>
              ) : null}
              {invoice.payments.map((payment) => (
                <article
                  key={payment.id}
                  className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-semibold">
                      {paymentMethodLabels[payment.method]} -{" "}
                      {formatCurrency(payment.amount)}
                    </span>
                    <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                      {paymentStatusLabels[payment.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#6b7890]">
                    {formatDate(payment.paidAt)}
                    {payment.reference ? ` - ${payment.reference}` : ""}
                  </p>
                </article>
              ))}
            </div>
          </DetailCard>
        </div>
      </div>
    </AppPageShell>
  );
}
