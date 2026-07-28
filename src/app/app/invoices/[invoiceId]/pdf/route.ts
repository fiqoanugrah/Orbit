import { notFound } from "next/navigation";
import { NextResponse } from "next/server";

import {
  requireActiveMembership,
  requireActiveOrganization,
} from "@/lib/organization";
import { createInvoicePdf, createJpegPdfImage } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paymentMethodLabels = {
  CASH: "Cash",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
} as const;

const paymentStatusLabels = {
  CANCELLED: "Cancelled",
  CONFIRMED: "Confirmed",
  PENDING: "Pending",
} as const;

const invoiceStatusLabels = {
  DRAFT: "Draft",
  OVERDUE: "Overdue",
  PAID: "Paid",
  PARTIAL: "Partial",
  UNPAID: "Unpaid",
  VOID: "Void",
} as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatInvoiceDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "-";
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

function filename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function studentCode(createdAt: Date, id: string) {
  const year = String(createdAt.getFullYear()).slice(-2);
  const digits = id.replace(/\D/g, "").slice(-4).padStart(4, "0");
  return `S${year}-${digits}`;
}

function programLevel(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function itemCode(description: string) {
  return description
    .split(" - ")[0]
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 10);
}

function itemUnit(billingRule: string | null | undefined) {
  switch (billingRule) {
    case "MONTHLY":
      return "month";
    case "PRIVATE":
      return "session";
    case "TRIAL":
      return "trial";
    default:
      return "term";
  }
}

async function loadOrganizationLogo(photoUrl: string | null) {
  if (!photoUrl) {
    return null;
  }

  if (photoUrl.startsWith("data:image/jpeg;base64,")) {
    return createJpegPdfImage(
      Buffer.from(photoUrl.replace("data:image/jpeg;base64,", ""), "base64"),
    );
  }

  if (photoUrl.startsWith("data:image/jpg;base64,")) {
    return createJpegPdfImage(
      Buffer.from(photoUrl.replace("data:image/jpg;base64,", ""), "base64"),
    );
  }

  if (!photoUrl.startsWith("http://") && !photoUrl.startsWith("https://")) {
    return null;
  }

  try {
    const response = await fetch(photoUrl, { cache: "no-store" });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const buffer = Buffer.from(await response.arrayBuffer());

    if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      return createJpegPdfImage(buffer);
    }

    return createJpegPdfImage(buffer);
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params;
  const organization = await requireActiveOrganization("/app/invoices");
  await requireActiveMembership(organization.id, "/app/invoices");

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      organizationId: organization.id,
    },
    include: {
      enrollment: {
        include: {
          class: {
            include: {
              program: true,
            },
          },
        },
      },
      lines: true,
      payments: { orderBy: { paidAt: "asc" } },
      pricingPlan: {
        include: {
          program: true,
        },
      },
      student: { include: { parent: true } },
    },
  });

  if (!invoice) {
    notFound();
  }

  const paid = invoice.payments
    .filter((payment) => payment.status === "CONFIRMED")
    .reduce((total, payment) => total + payment.amount, 0);
  const balance = Math.max(invoice.total - paid, 0);
  const logo = await loadOrganizationLogo(organization.photoUrl);
  const pdf = createInvoicePdf({
    adjustmentAmount: formatCurrency(invoice.adjustmentAmount),
    balance: formatCurrency(balance),
    dueAt: formatInvoiceDate(invoice.dueAt),
    invoiceNumber: invoice.invoiceNumber,
    issuedAt: formatInvoiceDate(invoice.issuedAt),
    lines: invoice.lines.map((line) => ({
      code: itemCode(line.description),
      description: line.description,
      quantity: line.quantity,
      total: formatCurrency(line.total),
      unit: itemUnit(invoice.pricingPlan?.billingRule),
      unitPrice: formatCurrency(line.unitPrice),
    })),
    organization: {
      address: organization.address ?? "-",
      email: organization.email ?? "",
      logo,
      name: organization.name,
      phone: organization.phone ?? "",
    },
    paid: formatCurrency(paid),
    payments: invoice.payments.map((payment) => ({
      amount: formatCurrency(payment.amount),
      date: formatDate(payment.paidAt),
      method: paymentMethodLabels[payment.method],
      reference: payment.reference ?? "",
      status: paymentStatusLabels[payment.status],
    })),
    status: invoiceStatusLabels[invoice.status],
    student: {
      alternateName: "",
      code: studentCode(invoice.student.createdAt, invoice.student.id),
      level: programLevel(
        invoice.pricingPlan?.program.level ?? invoice.enrollment?.class.program.level,
      ),
      name: invoice.student.name,
      parent: invoice.student.parent?.name ?? "",
    },
    subtotal: formatCurrency(invoice.subtotal),
    total: formatCurrency(invoice.total),
  });

  return new NextResponse(pdf, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename(invoice.invoiceNumber)}.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}
