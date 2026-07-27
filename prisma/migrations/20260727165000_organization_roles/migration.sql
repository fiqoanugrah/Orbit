CREATE TABLE "organization_roles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_roles_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Membership" ADD COLUMN "customRoleId" TEXT;

CREATE UNIQUE INDEX "organization_roles_organizationId_name_key" ON "organization_roles"("organizationId", "name");
CREATE INDEX "organization_roles_organizationId_idx" ON "organization_roles"("organizationId");
CREATE INDEX "Membership_customRoleId_idx" ON "Membership"("customRoleId");

ALTER TABLE "organization_roles"
ADD CONSTRAINT "organization_roles_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Membership"
ADD CONSTRAINT "Membership_customRoleId_fkey"
FOREIGN KEY ("customRoleId") REFERENCES "organization_roles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "organization_roles" (
    "id",
    "organizationId",
    "name",
    "description",
    "permissions",
    "isSystem",
    "createdAt",
    "updatedAt"
)
SELECT
    'role_owner_' || substr(md5("id" || ':owner'), 1, 16),
    "id",
    'Owner',
    'Full access untuk pemilik tempat les.',
    ARRAY[
      'organization.profile.manage',
      'members.manage',
      'roles.manage',
      'students.manage',
      'classes.manage',
      'billing.manage',
      'attendance.manage',
      'reports.view'
    ],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Organization"
ON CONFLICT ("organizationId", "name") DO NOTHING;

INSERT INTO "organization_roles" (
    "id",
    "organizationId",
    "name",
    "description",
    "permissions",
    "isSystem",
    "createdAt",
    "updatedAt"
)
SELECT
    'role_admin_' || substr(md5("id" || ':admin'), 1, 16),
    "id",
    'Admin',
    'Akses operasional harian tanpa pengaturan owner.',
    ARRAY[
      'organization.profile.manage',
      'students.manage',
      'classes.manage',
      'billing.manage',
      'attendance.manage',
      'reports.view'
    ],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Organization"
ON CONFLICT ("organizationId", "name") DO NOTHING;

INSERT INTO "organization_roles" (
    "id",
    "organizationId",
    "name",
    "description",
    "permissions",
    "isSystem",
    "createdAt",
    "updatedAt"
)
SELECT
    'role_teacher_' || substr(md5("id" || ':teacher'), 1, 16),
    "id",
    'Teacher',
    'Akses kelas dan absensi untuk pengajar.',
    ARRAY[
      'classes.manage',
      'attendance.manage'
    ],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Organization"
ON CONFLICT ("organizationId", "name") DO NOTHING;

UPDATE "Membership" AS membership
SET "customRoleId" = role_row."id"
FROM "organization_roles" AS role_row
WHERE role_row."organizationId" = membership."organizationId"
  AND role_row."name" = CASE membership."role"
    WHEN 'OWNER' THEN 'Owner'
    WHEN 'ADMIN' THEN 'Admin'
    WHEN 'TEACHER' THEN 'Teacher'
  END;
