CREATE TYPE "HolidayAction" AS ENUM ('SKIP', 'SHIFT_NEXT');

CREATE TABLE "Holiday" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "action" "HolidayAction" NOT NULL DEFAULT 'SKIP',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Holiday_organizationId_date_key" ON "Holiday"("organizationId", "date");
CREATE INDEX "Holiday_organizationId_idx" ON "Holiday"("organizationId");
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");

ALTER TABLE "Holiday"
  ADD CONSTRAINT "Holiday_organizationId_fkey"
  FOREIGN KEY ("organizationId")
  REFERENCES "Organization"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
