"use server";

import {
  BillingAgreementStatus,
  BillingRule,
  EnrollmentStatus,
} from "@prisma/client";
import { redirect } from "next/navigation";

import {
  requireActiveMembership,
  requireActiveOrganization,
} from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";

const enrollmentStatuses = Object.values(EnrollmentStatus);
const billingRules = Object.values(BillingRule);
const billingAgreementStatuses = Object.values(BillingAgreementStatus);

async function requireEnrollmentsManager() {
  const organization = await requireActiveOrganization("/app/enrollments");
  const membership = await requireActiveMembership(
    organization.id,
    "/app/enrollments",
  );

  if (!hasOrganizationPermission(membership, "students.manage")) {
    redirect("/app/enrollments?error=permission");
  }

  return organization;
}

async function requireBillingAgreementManager() {
  const organization = await requireActiveOrganization("/app/enrollments");
  const membership = await requireActiveMembership(
    organization.id,
    "/app/enrollments",
  );

  if (!hasOrganizationPermission(membership, "billing.manage")) {
    redirect("/app/enrollments?error=permission");
  }

  return organization;
}

function getEnrollmentsRedirect(formData: FormData, fallback: string) {
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();

  return redirectTo.startsWith("/app/enrollments") ||
    redirectTo.startsWith("/app/students")
    ? redirectTo
    : fallback;
}

function getDate(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getStatus(formData: FormData) {
  const value = String(formData.get("status") ?? "").trim();

  return enrollmentStatuses.includes(value as EnrollmentStatus)
    ? (value as EnrollmentStatus)
    : null;
}

function getBillingRule(formData: FormData) {
  const value = String(formData.get("billingRule") ?? "").trim();

  return billingRules.includes(value as BillingRule)
    ? (value as BillingRule)
    : null;
}

function getBillingAgreementStatus(formData: FormData) {
  const value = String(formData.get("agreementStatus") ?? "").trim();

  return billingAgreementStatuses.includes(value as BillingAgreementStatus)
    ? (value as BillingAgreementStatus)
    : null;
}

function getPositiveAmount(formData: FormData, key: string) {
  const amount = Number.parseInt(String(formData.get(key) ?? ""), 10);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

async function requireStudent(organizationId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, organizationId },
    select: { id: true },
  });

  if (!student) {
    redirect("/app/enrollments?error=student");
  }

  return student;
}

async function requireClass(organizationId: string, classId: string) {
  const classItem = await prisma.class.findFirst({
    where: { id: classId, organizationId },
    select: { academicPeriodId: true, id: true, maxStudents: true },
  });

  if (!classItem) {
    redirect("/app/enrollments?error=class");
  }

  return classItem;
}

async function requireEnrollmentForBilling(
  organizationId: string,
  enrollmentId: string,
) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, organizationId },
    include: {
      class: { select: { programId: true } },
      student: { select: { id: true } },
    },
  });

  if (!enrollment) {
    redirect("/app/enrollments?error=enrollment");
  }

  return enrollment;
}

async function requirePricingPlanForBilling(
  organizationId: string,
  pricingPlanId: string,
) {
  const pricingPlan = await prisma.pricingPlan.findFirst({
    where: { id: pricingPlanId, organizationId, isActive: true },
    select: { billingRule: true, id: true, price: true, programId: true },
  });

  if (!pricingPlan) {
    redirect("/app/enrollments?error=billing-plan");
  }

  return pricingPlan;
}

function getEnrollmentPayload(formData: FormData) {
  const joinedAt = getDate(formData, "joinedAt") ?? new Date();
  const endedAt = getDate(formData, "endedAt");

  return {
    classId: String(formData.get("classId") ?? "").trim(),
    endedAt,
    joinedAt,
    status: getStatus(formData),
    studentId: String(formData.get("studentId") ?? "").trim(),
  };
}

async function validateEnrollmentPayload(
  organizationId: string,
  data: ReturnType<typeof getEnrollmentPayload>,
  existingEnrollmentId?: string,
) {
  if (!data.studentId || !data.classId || !data.status) {
    redirect("/app/enrollments?error=enrollment-data");
  }

  if (data.endedAt && data.endedAt < data.joinedAt) {
    redirect("/app/enrollments?error=enrollment-dates");
  }

  await requireStudent(organizationId, data.studentId);
  const classItem = await requireClass(organizationId, data.classId);

  const duplicateEnrollment = await prisma.enrollment.findFirst({
    where: {
      academicPeriodId: classItem.academicPeriodId,
      classId: data.classId,
      studentId: data.studentId,
      ...(existingEnrollmentId ? { NOT: { id: existingEnrollmentId } } : {}),
    },
    select: { id: true },
  });

  if (duplicateEnrollment) {
    redirect("/app/enrollments?error=duplicate");
  }

  return classItem;
}

export async function createEnrollment(formData: FormData) {
  const organization = await requireEnrollmentsManager();
  const data = getEnrollmentPayload(formData);
  const classItem = await validateEnrollmentPayload(organization.id, data);

  await prisma.enrollment.create({
    data: {
      organizationId: organization.id,
      studentId: data.studentId,
      classId: data.classId,
      academicPeriodId: classItem.academicPeriodId,
      status: data.status as EnrollmentStatus,
      joinedAt: data.joinedAt,
      endedAt: data.endedAt,
    },
  });

  redirect(getEnrollmentsRedirect(formData, "/app/enrollments?created=1"));
}

export async function updateEnrollment(formData: FormData) {
  const organization = await requireEnrollmentsManager();
  const enrollmentId = String(formData.get("enrollmentId") ?? "").trim();
  const data = getEnrollmentPayload(formData);

  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, organizationId: organization.id },
    select: { id: true },
  });

  if (!enrollment) {
    redirect("/app/enrollments?error=enrollment");
  }

  const classItem = await validateEnrollmentPayload(
    organization.id,
    data,
    enrollment.id,
  );

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      studentId: data.studentId,
      classId: data.classId,
      academicPeriodId: classItem.academicPeriodId,
      status: data.status as EnrollmentStatus,
      joinedAt: data.joinedAt,
      endedAt: data.endedAt,
    },
  });

  redirect(getEnrollmentsRedirect(formData, "/app/enrollments?updated=1"));
}

export async function deleteEnrollment(formData: FormData) {
  const organization = await requireEnrollmentsManager();
  const enrollmentId = String(formData.get("enrollmentId") ?? "").trim();

  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, organizationId: organization.id },
    select: {
      id: true,
      _count: { select: { attendance: true, invoices: true } },
    },
  });

  if (!enrollment) {
    redirect("/app/enrollments?error=enrollment");
  }

  if (enrollment._count.attendance > 0 || enrollment._count.invoices > 0) {
    redirect("/app/enrollments?error=enrollment-has-records");
  }

  await prisma.enrollment.delete({ where: { id: enrollment.id } });

  redirect(getEnrollmentsRedirect(formData, "/app/enrollments?deleted=1"));
}

function getBillingAgreementPayload(formData: FormData) {
  const startsAt = getDate(formData, "startsAt") ?? new Date();
  const endsAt = getDate(formData, "endsAt");

  return {
    amount: getPositiveAmount(formData, "amount"),
    billingRule: getBillingRule(formData),
    enrollmentId: String(formData.get("agreementEnrollmentId") ?? "").trim(),
    endsAt,
    notes: String(formData.get("notes") ?? "").trim() || null,
    pricingPlanId: String(formData.get("agreementPricingPlanId") ?? "").trim(),
    startsAt,
    status: getBillingAgreementStatus(formData),
  };
}

async function validateBillingAgreementPayload(
  organizationId: string,
  data: ReturnType<typeof getBillingAgreementPayload>,
) {
  if (
    !data.enrollmentId ||
    !data.pricingPlanId ||
    !data.billingRule ||
    !data.status ||
    !data.amount
  ) {
    redirect("/app/enrollments?error=billing-data");
  }

  if (data.endsAt && data.endsAt < data.startsAt) {
    redirect("/app/enrollments?error=billing-dates");
  }

  const [enrollment, pricingPlan] = await Promise.all([
    requireEnrollmentForBilling(organizationId, data.enrollmentId),
    requirePricingPlanForBilling(organizationId, data.pricingPlanId),
  ]);

  if (enrollment.class.programId !== pricingPlan.programId) {
    redirect("/app/enrollments?error=billing-program");
  }

  return { enrollment, pricingPlan };
}

export async function createBillingAgreement(formData: FormData) {
  const organization = await requireBillingAgreementManager();
  const data = getBillingAgreementPayload(formData);
  const { enrollment } = await validateBillingAgreementPayload(
    organization.id,
    data,
  );

  await prisma.$transaction([
    prisma.billingAgreement.updateMany({
      where: {
        enrollmentId: enrollment.id,
        organizationId: organization.id,
        status: BillingAgreementStatus.ACTIVE,
      },
      data: {
        endsAt: data.startsAt,
        status: BillingAgreementStatus.ENDED,
      },
    }),
    prisma.billingAgreement.create({
      data: {
        organizationId: organization.id,
        studentId: enrollment.studentId,
        enrollmentId: enrollment.id,
        academicPeriodId: enrollment.academicPeriodId,
        pricingPlanId: data.pricingPlanId,
        billingRule: data.billingRule as BillingRule,
        status: data.status as BillingAgreementStatus,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        amount: data.amount as number,
        notes: data.notes,
      },
    }),
  ]);

  redirect(
    getEnrollmentsRedirect(formData, "/app/enrollments?billingCreated=1"),
  );
}

export async function updateBillingAgreement(formData: FormData) {
  const organization = await requireBillingAgreementManager();
  const agreementId = String(formData.get("agreementId") ?? "").trim();
  const data = getBillingAgreementPayload(formData);

  const agreement = await prisma.billingAgreement.findFirst({
    where: { id: agreementId, organizationId: organization.id },
    select: { id: true },
  });

  if (!agreement) {
    redirect("/app/enrollments?error=billing-agreement");
  }

  const { enrollment } = await validateBillingAgreementPayload(
    organization.id,
    data,
  );

  await prisma.billingAgreement.update({
    where: { id: agreement.id },
    data: {
      studentId: enrollment.studentId,
      enrollmentId: enrollment.id,
      academicPeriodId: enrollment.academicPeriodId,
      pricingPlanId: data.pricingPlanId,
      billingRule: data.billingRule as BillingRule,
      status: data.status as BillingAgreementStatus,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      amount: data.amount as number,
      notes: data.notes,
    },
  });

  redirect(
    getEnrollmentsRedirect(formData, "/app/enrollments?billingUpdated=1"),
  );
}

export async function endBillingAgreement(formData: FormData) {
  const organization = await requireBillingAgreementManager();
  const agreementId = String(formData.get("agreementId") ?? "").trim();
  const endedAt = getDate(formData, "endedAt") ?? new Date();

  const agreement = await prisma.billingAgreement.findFirst({
    where: { id: agreementId, organizationId: organization.id },
    select: { id: true, startsAt: true },
  });

  if (!agreement) {
    redirect("/app/enrollments?error=billing-agreement");
  }

  if (endedAt < agreement.startsAt) {
    redirect("/app/enrollments?error=billing-dates");
  }

  await prisma.billingAgreement.update({
    where: { id: agreement.id },
    data: {
      endsAt: endedAt,
      status: BillingAgreementStatus.ENDED,
    },
  });

  redirect(
    getEnrollmentsRedirect(formData, "/app/enrollments?billingUpdated=1"),
  );
}

export async function deleteBillingAgreement(formData: FormData) {
  const organization = await requireBillingAgreementManager();
  const agreementId = String(formData.get("agreementId") ?? "").trim();

  const agreement = await prisma.billingAgreement.findFirst({
    where: { id: agreementId, organizationId: organization.id },
    select: { id: true, _count: { select: { invoices: true } } },
  });

  if (!agreement) {
    redirect("/app/enrollments?error=billing-agreement");
  }

  if (agreement._count.invoices > 0) {
    redirect("/app/enrollments?error=billing-has-invoices");
  }

  await prisma.billingAgreement.delete({ where: { id: agreement.id } });

  redirect(
    getEnrollmentsRedirect(formData, "/app/enrollments?billingDeleted=1"),
  );
}
