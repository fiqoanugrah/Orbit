"use server";

import { InvoiceStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import {
  requireActiveMembership,
  requireActiveOrganization,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";

const invoiceStatuses = Object.values(InvoiceStatus);
const paymentMethods = Object.values(PaymentMethod);
const paymentStatuses = Object.values(PaymentStatus);
const registrationFeeDescription = "Registration Fee";

async function requireInvoiceManager() {
  const organization = await requireActiveOrganization("/app/invoices");
  const membership = await requireActiveMembership(
    organization.id,
    "/app/invoices",
  );

  if (!hasOrganizationPermission(membership, "billing.manage")) {
    redirect("/app/invoices?error=permission");
  }

  return organization;
}

function getInvoicesRedirect(formData: FormData, fallback: string) {
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();

  return redirectTo.startsWith("/app/invoices") ||
    redirectTo.startsWith("/app/students")
    ? redirectTo
    : fallback;
}

function getText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function getDate(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getInteger(formData: FormData, key: string, fallback = 0) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getPositiveInt(formData: FormData, key: string) {
  const value = Number.parseInt(String(formData.get(key) ?? ""), 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getInvoiceStatus(formData: FormData) {
  const value = String(formData.get("status") ?? "").trim();

  return invoiceStatuses.includes(value as InvoiceStatus)
    ? (value as InvoiceStatus)
    : null;
}

function getPaymentMethod(formData: FormData) {
  const value = String(formData.get("method") ?? "").trim();

  return paymentMethods.includes(value as PaymentMethod)
    ? (value as PaymentMethod)
    : null;
}

function getPaymentStatus(formData: FormData) {
  const value = String(formData.get("status") ?? "").trim();

  return paymentStatuses.includes(value as PaymentStatus)
    ? (value as PaymentStatus)
    : null;
}

function isPastDue(dueAt: Date | null) {
  if (!dueAt) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueAt < today;
}

function resolveInvoiceStatus({
  confirmedPaid,
  currentStatus,
  dueAt,
  issuedAt,
  total,
}: {
  confirmedPaid: number;
  currentStatus: InvoiceStatus;
  dueAt: Date | null;
  issuedAt: Date | null;
  total: number;
}) {
  if (currentStatus === InvoiceStatus.VOID) {
    return InvoiceStatus.VOID;
  }

  if (confirmedPaid >= total && total > 0) {
    return InvoiceStatus.PAID;
  }

  if (confirmedPaid > 0) {
    return InvoiceStatus.PARTIAL;
  }

  if (currentStatus === InvoiceStatus.DRAFT && !issuedAt) {
    return InvoiceStatus.DRAFT;
  }

  return isPastDue(dueAt) ? InvoiceStatus.OVERDUE : InvoiceStatus.UNPAID;
}

async function recalculateInvoiceStatus(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });

  if (!invoice) {
    return;
  }

  const confirmedPaid = invoice.payments
    .filter((payment) => payment.status === PaymentStatus.CONFIRMED)
    .reduce((total, payment) => total + payment.amount, 0);

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: resolveInvoiceStatus({
        confirmedPaid,
        currentStatus: invoice.status,
        dueAt: invoice.dueAt,
        issuedAt: invoice.issuedAt,
        total: invoice.total,
      }),
    },
  });
}

async function nextInvoiceNumber(organizationId: string, issuedAt: Date | null) {
  const baseDate = issuedAt ?? new Date();
  const datePart = baseDate.toISOString().slice(0, 10).replaceAll("-", "");
  const prefix = `INV-${datePart}`;
  const count = await prisma.invoice.count({
    where: {
      invoiceNumber: { startsWith: prefix },
      organizationId,
    },
  });

  return `${prefix}-${String(count + 1).padStart(3, "0")}`;
}

async function requireEnrollment(organizationId: string, enrollmentId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, organizationId },
    include: { class: true, student: true },
  });

  if (!enrollment) {
    redirect("/app/invoices?error=enrollment");
  }

  return enrollment;
}

async function requirePricingPlan(
  organizationId: string,
  pricingPlanId: string,
) {
  const pricingPlan = await prisma.pricingPlan.findFirst({
    where: { id: pricingPlanId, organizationId },
    include: { program: true },
  });

  if (!pricingPlan) {
    redirect("/app/invoices?error=package");
  }

  return pricingPlan;
}

async function requireBillingAgreement(
  organizationId: string,
  billingAgreementId: string,
) {
  const agreement = await prisma.billingAgreement.findFirst({
    where: { id: billingAgreementId, organizationId },
    include: {
      enrollment: { include: { class: true, student: true } },
      pricingPlan: { include: { program: true } },
    },
  });

  if (!agreement || !agreement.enrollment || !agreement.pricingPlan) {
    redirect("/app/invoices?error=billing-agreement");
  }

  return agreement;
}

function getInvoicePayload(formData: FormData) {
  const adjustmentAmount = getInteger(formData, "adjustmentAmount", 0);
  const extraLineAmount = getInteger(formData, "extraLineAmount", 0);
  const issuedAt = getDate(formData, "issuedAt");
  const dueAt = getDate(formData, "dueAt");
  const registrationFeeAmount = getInteger(formData, "registrationFeeAmount", 0);

  return {
    adjustmentAmount,
    billingAgreementId: String(
      formData.get("billingAgreementId") ?? "",
    ).trim(),
    dueAt,
    enrollmentId: String(formData.get("enrollmentId") ?? "").trim(),
    extraLineAmount,
    extraLineDescription: getText(formData, "extraLineDescription"),
    issuedAt,
    pricingPlanId: String(formData.get("pricingPlanId") ?? "").trim(),
    registrationFeeAmount,
    status: getInvoiceStatus(formData),
    voidReason: getText(formData, "voidReason"),
  };
}

async function validateInvoicePayload(
  organizationId: string,
  data: ReturnType<typeof getInvoicePayload>,
  currentInvoiceId?: string,
) {
  if (
    !data.status ||
    data.adjustmentAmount === null ||
    data.extraLineAmount === null ||
    data.extraLineAmount < 0 ||
    data.registrationFeeAmount === null ||
    data.registrationFeeAmount < 0
  ) {
    redirect("/app/invoices?error=invoice-data");
  }

  if (data.extraLineAmount > 0 && !data.extraLineDescription) {
    redirect("/app/invoices?error=invoice-data");
  }

  if (data.issuedAt && data.dueAt && data.dueAt < data.issuedAt) {
    redirect("/app/invoices?error=invoice-dates");
  }

  const agreement = data.billingAgreementId
    ? await requireBillingAgreement(organizationId, data.billingAgreementId)
    : null;
  const [enrollment, pricingPlan] = agreement
    ? [agreement.enrollment, agreement.pricingPlan]
    : await Promise.all([
        data.enrollmentId
          ? requireEnrollment(organizationId, data.enrollmentId)
          : null,
        data.pricingPlanId
          ? requirePricingPlan(organizationId, data.pricingPlanId)
          : null,
      ]);

  if (!enrollment || !pricingPlan) {
    redirect("/app/invoices?error=invoice-data");
  }

  if (enrollment.class.programId !== pricingPlan.programId) {
    redirect("/app/invoices?error=package-program");
  }

  if (data.registrationFeeAmount > 0) {
    const existingRegistrationFee = await prisma.invoice.findFirst({
      where: {
        organizationId,
        studentId: enrollment.studentId,
        status: { not: InvoiceStatus.VOID },
        ...(currentInvoiceId ? { id: { not: currentInvoiceId } } : {}),
        lines: {
          some: {
            description: registrationFeeDescription,
          },
        },
      },
      select: { id: true },
    });

    if (existingRegistrationFee) {
      redirect("/app/invoices?error=registration-fee-duplicate");
    }
  }

  const invoiceLines = [
    {
      description: `${pricingPlan.program.name} - ${pricingPlan.name}`,
      quantity: 1,
      unitPrice: agreement?.amount ?? pricingPlan.price,
      total: agreement?.amount ?? pricingPlan.price,
    },
  ];

  if (data.registrationFeeAmount > 0) {
    invoiceLines.push({
      description: registrationFeeDescription,
      quantity: 1,
      unitPrice: data.registrationFeeAmount,
      total: data.registrationFeeAmount,
    });
  }

  if (data.extraLineAmount > 0 && data.extraLineDescription) {
    invoiceLines.push({
      description: data.extraLineDescription,
      quantity: 1,
      unitPrice: data.extraLineAmount,
      total: data.extraLineAmount,
    });
  }

  const subtotal = invoiceLines.reduce((total, line) => total + line.total, 0);
  const total = Math.max(subtotal + data.adjustmentAmount, 0);

  return {
    enrollment,
    billingAgreement: agreement,
    invoiceLines,
    pricingPlan,
    subtotal,
    total,
  };
}

export async function createInvoice(formData: FormData) {
  const organization = await requireInvoiceManager();
  const data = getInvoicePayload(formData);
  const payload = await validateInvoicePayload(organization.id, data);
  const invoiceNumber = await nextInvoiceNumber(organization.id, data.issuedAt);

  await prisma.invoice.create({
    data: {
      organizationId: organization.id,
      academicPeriodId: payload.enrollment.academicPeriodId,
      studentId: payload.enrollment.studentId,
      enrollmentId: payload.enrollment.id,
      pricingPlanId: payload.pricingPlan.id,
      billingAgreementId: payload.billingAgreement?.id ?? null,
      invoiceNumber,
      status: data.status as InvoiceStatus,
      subtotal: payload.subtotal,
      adjustmentAmount: data.adjustmentAmount as number,
      total: payload.total,
      issuedAt: data.issuedAt,
      dueAt: data.dueAt,
      lines: {
        create: payload.invoiceLines,
      },
    },
  });

  redirect(getInvoicesRedirect(formData, "/app/invoices?created=1"));
}

export async function updateInvoice(formData: FormData) {
  const organization = await requireInvoiceManager();
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  const data = getInvoicePayload(formData);

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: organization.id },
    include: { payments: true },
  });

  if (!invoice) {
    redirect("/app/invoices?error=invoice");
  }

  if (invoice.status === InvoiceStatus.VOID) {
    redirect("/app/invoices?error=invoice-void");
  }

  const payload = await validateInvoicePayload(organization.id, data, invoice.id);
  const confirmedPaid = invoice.payments
    .filter((payment) => payment.status === PaymentStatus.CONFIRMED)
    .reduce((total, payment) => total + payment.amount, 0);
  const status = resolveInvoiceStatus({
    confirmedPaid,
    currentStatus: data.status as InvoiceStatus,
    dueAt: data.dueAt,
    issuedAt: data.issuedAt,
    total: payload.total,
  });

  await prisma.$transaction([
    prisma.invoiceLine.deleteMany({ where: { invoiceId: invoice.id } }),
    prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        academicPeriodId: payload.enrollment.academicPeriodId,
        studentId: payload.enrollment.studentId,
        enrollmentId: payload.enrollment.id,
        pricingPlanId: payload.pricingPlan.id,
        billingAgreementId: payload.billingAgreement?.id ?? null,
        status,
        subtotal: payload.subtotal,
        adjustmentAmount: data.adjustmentAmount as number,
        total: payload.total,
        issuedAt: data.issuedAt,
        dueAt: data.dueAt,
        voidReason: null,
        voidedAt: null,
        lines: {
          create: payload.invoiceLines,
        },
      },
    }),
  ]);

  redirect(getInvoicesRedirect(formData, "/app/invoices?updated=1"));
}

export async function voidInvoice(formData: FormData) {
  const organization = await requireInvoiceManager();
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  const voidReason = getText(formData, "voidReason");

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: organization.id },
    select: { id: true },
  });

  if (!invoice) {
    redirect("/app/invoices?error=invoice");
  }

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: InvoiceStatus.VOID,
      voidedAt: new Date(),
      voidReason,
    },
  });

  redirect(getInvoicesRedirect(formData, "/app/invoices?voided=1"));
}

export async function deleteInvoice(formData: FormData) {
  const organization = await requireInvoiceManager();
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: organization.id },
    select: {
      id: true,
      _count: { select: { payments: true } },
    },
  });

  if (!invoice) {
    redirect("/app/invoices?error=invoice");
  }

  if (invoice._count.payments > 0) {
    redirect("/app/invoices?error=invoice-has-payments");
  }

  await prisma.invoice.delete({ where: { id: invoice.id } });

  redirect("/app/invoices?deleted=1");
}

export async function createPayment(formData: FormData) {
  const organization = await requireInvoiceManager();
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  const amount = getPositiveInt(formData, "amount");
  const method = getPaymentMethod(formData);
  const status = getPaymentStatus(formData);
  const paidAt = getDate(formData, "paidAt") ?? new Date();
  const reference = getText(formData, "reference");
  const notes = getText(formData, "notes");

  if (!amount || !method || !status) {
    redirect("/app/invoices?error=payment-data");
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: organization.id },
    select: { id: true, status: true },
  });

  if (!invoice) {
    redirect("/app/invoices?error=invoice");
  }

  if (invoice.status === InvoiceStatus.VOID) {
    redirect("/app/invoices?error=invoice-void");
  }

  await prisma.payment.create({
    data: {
      organizationId: organization.id,
      invoiceId: invoice.id,
      amount,
      method,
      status,
      paidAt,
      reference,
      notes,
    },
  });
  await recalculateInvoiceStatus(invoice.id);

  redirect(getInvoicesRedirect(formData, "/app/invoices?paymentCreated=1"));
}

export async function deletePayment(formData: FormData) {
  const organization = await requireInvoiceManager();
  const paymentId = String(formData.get("paymentId") ?? "").trim();

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, organizationId: organization.id },
    select: { id: true, invoiceId: true },
  });

  if (!payment) {
    redirect("/app/invoices?error=payment");
  }

  await prisma.payment.delete({ where: { id: payment.id } });
  await recalculateInvoiceStatus(payment.invoiceId);

  redirect(getInvoicesRedirect(formData, "/app/invoices?paymentDeleted=1"));
}
