import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Check,
  ChevronDown,
  LogOut,
  Plus,
  Settings,
} from "lucide-react";

import { switchOrganization } from "@/app/app/actions";
import { signOut } from "@/app/auth/actions";
import { PendingButton } from "@/components/pending-button";

type SwitcherOrganization = {
  id: string;
  name: string;
  address: string | null;
  timezone: string;
  photoUrl: string | null;
  role: string;
};

type ActiveOrganization = Omit<SwitcherOrganization, "role">;

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

export function OrganizationSwitcher({
  activeOrganization,
  activeRole,
  organizations,
  currentPath,
}: {
  activeOrganization: ActiveOrganization;
  activeRole: string;
  organizations: SwitcherOrganization[];
  currentPath: string;
}) {
  return (
    <details className="group relative">
      <summary className="flex h-11 cursor-pointer list-none items-center gap-3 rounded-md border border-[#d7e0ea] bg-white px-3 text-left shadow-sm transition hover:bg-[#f1f5f9]">
        <span className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-[#eaf2ff] text-[#075bc9]">
          {activeOrganization.photoUrl ? (
            <Image
              src={activeOrganization.photoUrl}
              alt=""
              fill
              sizes="32px"
              className="object-cover"
            />
          ) : (
            <Building2 className="size-4" aria-hidden="true" />
          )}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-44 truncate text-sm font-semibold text-[#172033]">
            {activeOrganization.name}
          </span>
          <span className="block text-xs text-[#6b7890]">
            {formatRole(activeRole)}
          </span>
        </span>
        <ChevronDown
          className="size-4 text-[#6b7890] transition group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-[#dfe6ef] bg-white p-2 shadow-lg">
        <div className="px-3 py-2">
          <p className="text-xs font-semibold uppercase text-[#f5a623]">
            Workspace
          </p>
          <p className="mt-1 truncate text-sm font-semibold">
            {activeOrganization.name}
          </p>
        </div>

        <div className="max-h-72 overflow-y-auto border-y border-[#e6edf5] py-2">
          {organizations.map((organization) => (
            <form key={organization.id} action={switchOrganization}>
              <input
                type="hidden"
                name="organizationId"
                value={organization.id}
              />
              <input type="hidden" name="redirectTo" value={currentPath} />
              <PendingButton
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition hover:bg-[#f1f5f9] disabled:cursor-wait disabled:opacity-70"
                pendingChildren="Switching..."
              >
                <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-md bg-[#eaf2ff] text-[#075bc9]">
                  {organization.photoUrl ? (
                    <Image
                      src={organization.photoUrl}
                      alt=""
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  ) : (
                    <Building2 className="size-4" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {organization.name}
                  </span>
                  <span className="block truncate text-xs text-[#6b7890]">
                    {organization.address || organization.timezone}
                  </span>
                </span>
                {organization.id === activeOrganization.id ? (
                  <Check className="size-4 text-[#16834a]" aria-hidden="true" />
                ) : null}
              </PendingButton>
            </form>
          ))}
        </div>

        <div className="grid gap-1 pt-2">
          <Link
            href="/onboarding/create-organization"
            className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold text-[#172033] transition hover:bg-[#f1f5f9]"
          >
            <Plus className="size-4 text-[#0b6ffb]" aria-hidden="true" />
            New Organization
          </Link>
          <Link
            href="/app/profile"
            className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold text-[#172033] transition hover:bg-[#f1f5f9]"
          >
            <Settings className="size-4 text-[#536174]" aria-hidden="true" />
            Organization Settings
          </Link>
          <form action={signOut}>
            <PendingButton
              className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold text-[#c73535] transition hover:bg-[#fff4f4] disabled:cursor-wait disabled:opacity-70"
              pendingChildren="Keluar..."
            >
              <LogOut className="size-4" aria-hidden="true" />
              Keluar
            </PendingButton>
          </form>
        </div>
      </div>
    </details>
  );
}
