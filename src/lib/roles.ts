import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const organizationPermissions = [
  {
    key: "organization.profile.manage",
    label: "Kelola profile organization",
  },
  {
    key: "members.manage",
    label: "Kelola members",
  },
  {
    key: "roles.manage",
    label: "Kelola roles",
  },
  {
    key: "students.manage",
    label: "Kelola students",
  },
  {
    key: "classes.manage",
    label: "Kelola classes",
  },
  {
    key: "billing.manage",
    label: "Kelola billing",
  },
  {
    key: "attendance.manage",
    label: "Kelola attendance",
  },
  {
    key: "reports.view",
    label: "Lihat reports",
  },
] as const;

export const defaultOrganizationRoles = [
  {
    name: "Owner",
    systemRole: UserRole.OWNER,
    description: "Full access untuk pemilik tempat les.",
    permissions: organizationPermissions.map((permission) => permission.key),
  },
  {
    name: "Admin",
    systemRole: UserRole.ADMIN,
    description: "Akses operasional harian tanpa pengaturan owner.",
    permissions: [
      "organization.profile.manage",
      "students.manage",
      "classes.manage",
      "billing.manage",
      "attendance.manage",
      "reports.view",
    ],
  },
  {
    name: "Teacher",
    systemRole: UserRole.TEACHER,
    description: "Akses kelas dan absensi untuk pengajar.",
    permissions: ["classes.manage", "attendance.manage"],
  },
] as const;

export async function ensureDefaultOrganizationRoles(organizationId: string) {
  const roles = await Promise.all(
    defaultOrganizationRoles.map((role) =>
      prisma.organizationRole.upsert({
        where: {
          organizationId_name: {
            organizationId,
            name: role.name,
          },
        },
        update: {
          description: role.description,
          permissions: [...role.permissions],
          isSystem: true,
        },
        create: {
          organizationId,
          name: role.name,
          description: role.description,
          permissions: [...role.permissions],
          isSystem: true,
        },
      }),
    ),
  );

  return {
    ownerRole: roles.find((role) => role.name === "Owner") ?? roles[0],
    adminRole: roles.find((role) => role.name === "Admin") ?? roles[1],
    teacherRole: roles.find((role) => role.name === "Teacher") ?? roles[2],
    roles,
  };
}

export function canManageOrganizationRoles(role: UserRole) {
  return role === UserRole.OWNER || role === UserRole.ADMIN;
}
