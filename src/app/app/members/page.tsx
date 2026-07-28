import {
  Building2,
  CheckCircle2,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import { AppPageShell } from "@/app/app/app-page-shell";
import {
  addOrganizationMember,
  removeOrganizationMember,
  updateOrganizationMemberRole,
} from "@/app/app/members/actions";
import {
  requireWorkspaceContext,
} from "@/lib/organization";
import { pageListLimit } from "@/lib/performance";
import {
  canManageOrganizationMembers,
  getOrganizationPermissionKeys,
} from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PendingButton } from "@/components/pending-button";

export const dynamic = "force-dynamic";

const systemRoles = [
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "TEACHER", label: "Teacher" },
] as const;

const statusMessages = {
  added: "Member berhasil ditambahkan.",
  updated: "Role member berhasil diperbarui.",
  removed: "Member berhasil dihapus dari organization.",
} as const;

const errorMessages = {
  permission: "Akun kamu belum bisa mengelola member di organization ini.",
  email: "Email member belum valid.",
  member: "Member tidak ditemukan di organization ini.",
  "last-owner": "Organization harus punya minimal satu owner.",
  "self-remove": "Kamu tidak bisa menghapus membership kamu sendiri.",
} as const;

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{
    added?: string;
    error?: keyof typeof errorMessages;
    removed?: string;
    updated?: string;
  }>;
}) {
  const params = await searchParams;
  const { organization, membership, organizations } =
    await requireWorkspaceContext("/app/members");
  const canManageMembers = canManageOrganizationMembers(membership);

  const [members, roles] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId: organization.id },
      include: {
        customRole: true,
        user: true,
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      take: pageListLimit,
    }),
    prisma.organizationRole.findMany({
      where: { organizationId: organization.id },
      orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
    }),
  ]);

  const activeStatus = (["added", "updated", "removed"] as const).find(
    (key) => params[key],
  );

  return (
    <AppPageShell
      activePath="/app/members"
      activeRole={membership.customRole?.name ?? membership.role}
      eyebrow="Members"
      organization={organization}
      organizations={organizations}
      title="Manage Users"
    >
      <div className="mx-auto max-w-6xl">

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

        <section className="mb-6 grid gap-4 lg:grid-cols-3">
          <article className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <Users className="mb-4 size-5 text-[#0b6ffb]" />
            <p className="text-sm font-semibold">Organization Members</p>
            <p className="mt-2 text-3xl font-semibold">{members.length}</p>
            <p className="mt-1 text-sm text-[#6b7890]">
              User yang punya akses ke workspace aktif.
            </p>
          </article>
          <article className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <ShieldCheck className="mb-4 size-5 text-[#16834a]" />
            <p className="text-sm font-semibold">Roles Available</p>
            <p className="mt-2 text-3xl font-semibold">{roles.length}</p>
            <p className="mt-1 text-sm text-[#6b7890]">
              System role dan custom role milik organization.
            </p>
          </article>
          <article className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <Building2 className="mb-4 size-5 text-[#9c6400]" />
            <p className="text-sm font-semibold">Active Workspace</p>
            <p className="mt-2 truncate text-xl font-semibold">
              {organization.name}
            </p>
            <p className="mt-1 text-sm text-[#6b7890]">
              Semua perubahan hanya berlaku di organization ini.
            </p>
          </article>
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="border-b border-[#e6edf5] pb-5">
              <h2 className="text-lg font-semibold">Tambah Member</h2>
              <p className="mt-1 text-sm text-[#6b7890]">
                Tambahkan user ke workspace aktif dan pilih akses awalnya.
              </p>
            </div>

            <form action={addOrganizationMember} className="grid gap-4 pt-5">
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Nama</span>
                <input
                  name="name"
                  disabled={!canManageMembers}
                  placeholder="Nama member"
                  className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  disabled={!canManageMembers}
                  placeholder="member@tempatles.com"
                  className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">System role</span>
                  <select
                    name="role"
                    defaultValue="TEACHER"
                    disabled={!canManageMembers}
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  >
                    {systemRoles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Custom role</span>
                  <select
                    name="customRoleId"
                    disabled={!canManageMembers}
                    className="h-11 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none transition focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                  >
                    <option value="">Default permissions</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <PendingButton
                disabled={!canManageMembers}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:bg-[#b9c7d8]"
                pendingChildren="Menambahkan member..."
              >
                <UserPlus className="size-4" aria-hidden="true" />
                Tambah Member
              </PendingButton>
            </form>
          </section>

          <section className="rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="border-b border-[#e6edf5] pb-5">
              <h2 className="text-lg font-semibold">Member Aktif</h2>
              <p className="mt-1 text-sm text-[#6b7890]">
                Role di sini berlaku hanya di organization aktif.
              </p>
            </div>

            <div className="grid gap-3 pt-5">
              {members.map((member) => (
                <article
                  key={member.id}
                  className="rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-md bg-[#eaf2ff] text-sm font-semibold text-[#075bc9]">
                        {member.user.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {member.user.name}
                        </span>
                        <span className="block truncate text-xs text-[#6b7890]">
                          {member.user.email}
                        </span>
                        <span className="mt-2 inline-flex rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#536174]">
                          {member.customRole?.name ?? formatRole(member.role)}
                        </span>
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] xl:w-[34rem]">
                      <form
                        action={updateOrganizationMemberRole}
                        className="contents"
                      >
                        <input
                          type="hidden"
                          name="membershipId"
                          value={member.id}
                        />
                        <select
                          name="role"
                          defaultValue={member.role}
                          disabled={!canManageMembers}
                          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        >
                          {systemRoles.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        <select
                          name="customRoleId"
                          defaultValue={member.customRoleId ?? ""}
                          disabled={!canManageMembers}
                          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm outline-none focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15 disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                        >
                          <option value="">Default permissions</option>
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                        <PendingButton
                          disabled={!canManageMembers}
                          className="h-10 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9] disabled:bg-[#f6f8fb] disabled:text-[#9aa7b8]"
                          pendingChildren="Saving..."
                        >
                          Save
                        </PendingButton>
                      </form>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[#e6edf5] pt-3">
                    {getOrganizationPermissionKeys(member).map((permission) => (
                      <span
                        key={permission}
                        className="rounded-sm border border-[#d7e0ea] bg-white px-2 py-1 text-xs font-medium text-[#536174]"
                      >
                        {permission}
                      </span>
                    ))}
                  </div>

                  {member.userId !== membership.userId ? (
                    <form action={removeOrganizationMember} className="mt-3">
                      <input
                        type="hidden"
                        name="membershipId"
                        value={member.id}
                      />
                      <PendingButton
                        disabled={!canManageMembers}
                        className="flex h-9 items-center gap-2 rounded-md border border-[#f4c6c6] bg-white px-3 text-xs font-semibold text-[#c73535] transition hover:bg-[#fff4f4] disabled:bg-[#f6f8fb] disabled:text-[#d8a4a4]"
                        pendingChildren="Removing..."
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                        Remove member
                      </PendingButton>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppPageShell>
  );
}
