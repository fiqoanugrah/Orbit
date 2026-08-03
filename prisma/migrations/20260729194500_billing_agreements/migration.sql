CREATE TYPE "BillingAgreementStatus" AS ENUM ('ACTIVE', 'ENDED', 'CANCELLED');

CREATE TABLE "billing_agreements" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "pricingPlanId" TEXT,
    "academicPeriodId" TEXT,
    "billingRule" "BillingRule" NOT NULL,
    "status" "BillingAgreementStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "amount" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_agreements_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Invoice" ADD COLUMN "billingAgreementId" TEXT;

CREATE INDEX "billing_agreements_organizationId_idx" ON "billing_agreements"("organizationId");
CREATE INDEX "billing_agreements_studentId_idx" ON "billing_agreements"("studentId");
CREATE INDEX "billing_agreements_enrollmentId_idx" ON "billing_agreements"("enrollmentId");
CREATE INDEX "billing_agreements_pricingPlanId_idx" ON "billing_agreements"("pricingPlanId");
CREATE INDEX "billing_agreements_academicPeriodId_idx" ON "billing_agreements"("academicPeriodId");
CREATE INDEX "billing_agreements_status_idx" ON "billing_agreements"("status");
CREATE INDEX "Invoice_billingAgreementId_idx" ON "Invoice"("billingAgreementId");

ALTER TABLE "billing_agreements" ADD CONSTRAINT "billing_agreements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_agreements" ADD CONSTRAINT "billing_agreements_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_agreements" ADD CONSTRAINT "billing_agreements_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_agreements" ADD CONSTRAINT "billing_agreements_pricingPlanId_fkey" FOREIGN KEY ("pricingPlanId") REFERENCES "pricing_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_agreements" ADD CONSTRAINT "billing_agreements_academicPeriodId_fkey" FOREIGN KEY ("academicPeriodId") REFERENCES "AcademicPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_billingAgreementId_fkey" FOREIGN KEY ("billingAgreementId") REFERENCES "billing_agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
