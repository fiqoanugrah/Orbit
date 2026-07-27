import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, Plus } from "lucide-react";

import { switchOrganization } from "@/app/app/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#172033]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8 md:px-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-[#0b6ffb] text-sm font-bold text-white">
              O
            </span>
            <span className="text-lg font-semibold">Orbit</span>
          </Link>
          <Link
            href="/onboarding/create-organization"
            className="flex h-10 items-center gap-2 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9]"
          >
            <Plus className="size-4" aria-hidden="true" />
            Sign up
          </Link>
        </header>

        <section className="grid flex-1 place-items-center py-10">
          <div className="w-full max-w-2xl rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="border-b border-[#e6edf5] pb-5">
              <p className="text-sm font-semibold uppercase text-[#f5a623]">
                Masuk
              </p>
              <h1 className="mt-2 text-3xl font-semibold">
                Pilih tempat les.
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#6b7890]">
                Untuk sekarang Orbit memakai organization sebagai workspace.
                Nanti halaman ini bisa diganti login user sungguhan.
              </p>
            </div>

            {organizations.length > 0 ? (
              <div className="grid gap-3 py-5">
                {organizations.map((organization) => (
                  <form key={organization.id} action={switchOrganization}>
                    <input
                      type="hidden"
                      name="organizationId"
                      value={organization.id}
                    />
                    <button className="flex w-full items-center gap-3 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3 text-left transition hover:border-[#0b6ffb] hover:bg-[#eef5ff]">
                      <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-[#eaf2ff] text-[#075bc9]">
                        {organization.photoUrl ? (
                          <Image
                            src={organization.photoUrl}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <Building2 className="size-5" aria-hidden="true" />
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
                      <ArrowRight className="size-4 text-[#536174]" />
                    </button>
                  </form>
                ))}
              </div>
            ) : (
              <div className="py-6">
                <div className="rounded-md border border-dashed border-[#d7e0ea] bg-[#fbfcfe] p-5 text-center">
                  <Building2 className="mx-auto mb-3 size-6 text-[#0b6ffb]" />
                  <p className="text-sm font-semibold">
                    Belum ada tempat les.
                  </p>
                  <p className="mt-1 text-sm text-[#6b7890]">
                    Buat organization pertama untuk mulai memakai Orbit.
                  </p>
                </div>
              </div>
            )}

            <Link
              href="/onboarding/create-organization"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9]"
            >
              Buat Organization Baru
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
