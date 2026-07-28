import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

import { AppSidebar } from "@/app/app/app-navigation";
import { OrganizationSwitcher } from "@/app/app/organization-switcher";

type ShellOrganization = {
  id: string;
  name: string;
  address: string | null;
  timezone: string;
  photoUrl: string | null;
};

type ShellOrganizationWithRole = ShellOrganization & {
  role: string;
};

export function AppPageShell({
  activePath,
  activeRole,
  children,
  eyebrow,
  organization,
  organizations,
  title,
}: {
  activePath: string;
  activeRole: string;
  children: ReactNode;
  eyebrow: string;
  organization: ShellOrganization;
  organizations: ShellOrganizationWithRole[];
  title: string;
}) {
  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#172033]">
      <div className="flex min-h-screen">
        <AppSidebar activePath={activePath} organization={organization} />

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[#dfe6ef] bg-white/95 px-4 py-3 backdrop-blur md:px-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-[#f5a623]">
                  {eyebrow}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold text-[#172033]">
                    {title}
                  </h1>
                  <span className="inline-flex h-7 items-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-2 text-xs font-semibold text-[#536174]">
                    <ShieldCheck className="size-3.5 text-[#16834a]" />
                    {activeRole}
                  </span>
                </div>
              </div>
              <OrganizationSwitcher
                activeOrganization={organization}
                activeRole={activeRole}
                organizations={organizations}
                currentPath={activePath}
              />
            </div>
          </header>

          <div className="w-full px-4 py-6 md:px-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
