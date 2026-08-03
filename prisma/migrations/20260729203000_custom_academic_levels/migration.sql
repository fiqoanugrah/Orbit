CREATE TABLE "academic_levels" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_levels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_level_history" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromLevelId" TEXT,
    "toLevelId" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_level_history_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Program" ADD COLUMN "academicLevelId" TEXT;
ALTER TABLE "Student" ADD COLUMN "currentLevelId" TEXT;

CREATE UNIQUE INDEX "academic_levels_organizationId_name_key" ON "academic_levels"("organizationId", "name");
CREATE INDEX "academic_levels_organizationId_idx" ON "academic_levels"("organizationId");
CREATE INDEX "academic_levels_sortOrder_idx" ON "academic_levels"("sortOrder");
CREATE INDEX "student_level_history_organizationId_idx" ON "student_level_history"("organizationId");
CREATE INDEX "student_level_history_studentId_idx" ON "student_level_history"("studentId");
CREATE INDEX "student_level_history_fromLevelId_idx" ON "student_level_history"("fromLevelId");
CREATE INDEX "student_level_history_toLevelId_idx" ON "student_level_history"("toLevelId");
CREATE INDEX "student_level_history_effectiveAt_idx" ON "student_level_history"("effectiveAt");
CREATE INDEX "Program_academicLevelId_idx" ON "Program"("academicLevelId");
CREATE INDEX "Student_currentLevelId_idx" ON "Student"("currentLevelId");

ALTER TABLE "academic_levels" ADD CONSTRAINT "academic_levels_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_level_history" ADD CONSTRAINT "student_level_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_level_history" ADD CONSTRAINT "student_level_history_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_level_history" ADD CONSTRAINT "student_level_history_fromLevelId_fkey" FOREIGN KEY ("fromLevelId") REFERENCES "academic_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_level_history" ADD CONSTRAINT "student_level_history_toLevelId_fkey" FOREIGN KEY ("toLevelId") REFERENCES "academic_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Program" ADD CONSTRAINT "Program_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "academic_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_currentLevelId_fkey" FOREIGN KEY ("currentLevelId") REFERENCES "academic_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "academic_levels" ("id", "organizationId", "name", "sortOrder", "updatedAt")
SELECT
    CONCAT('level_', md5(CONCAT("organizationId", '-', "level"::TEXT))),
    "organizationId",
    INITCAP(REPLACE("level"::TEXT, '_', ' ')),
    CASE "level"::TEXT
        WHEN 'BRONZE' THEN 10
        WHEN 'SILVER' THEN 20
        WHEN 'GOLD' THEN 30
        WHEN 'INTERMEDIATE' THEN 40
        WHEN 'ADVANCED' THEN 50
        ELSE 100
    END,
    CURRENT_TIMESTAMP
FROM "Program"
WHERE "level" IS NOT NULL
GROUP BY "organizationId", "level"
ON CONFLICT ("organizationId", "name") DO NOTHING;

UPDATE "Program"
SET "academicLevelId" = "academic_levels"."id"
FROM "academic_levels"
WHERE "Program"."organizationId" = "academic_levels"."organizationId"
  AND INITCAP(REPLACE("Program"."level"::TEXT, '_', ' ')) = "academic_levels"."name";

UPDATE "Student"
SET "currentLevelId" = level_source."academicLevelId"
FROM (
    SELECT DISTINCT ON ("Enrollment"."studentId")
        "Enrollment"."studentId",
        "Program"."academicLevelId"
    FROM "Enrollment"
    INNER JOIN "Class" ON "Class"."id" = "Enrollment"."classId"
    INNER JOIN "Program" ON "Program"."id" = "Class"."programId"
    WHERE "Program"."academicLevelId" IS NOT NULL
    ORDER BY "Enrollment"."studentId", "Enrollment"."joinedAt" DESC
) AS level_source
WHERE "Student"."id" = level_source."studentId";
