import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  LogOut,
  Plus,
  UserCircle,
} from "lucide-react";

import { switchOrganization } from "@/app/app/actions";
import { signInWithGoogle, signOut } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth";
import { getOrganizationsForUser } from "@/lib/organization";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const organizations = user ? await getOrganizationsForUser(user.id) : [];
  const next = params.next ?? "/auth/sign-in";

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
          {user ? (
            <form action={signOut}>
              <button className="flex h-10 items-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]">
                <LogOut className="size-4" aria-hidden="true" />
                Keluar
              </button>
            </form>
          ) : (
            <Link
              href="/auth/sign-up"
              className="flex h-10 items-center gap-2 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9]"
            >
              <Plus className="size-4" aria-hidden="true" />
              Sign up
            </Link>
          )}
        </header>

        <section className="grid flex-1 place-items-center py-10">
          <div className="w-full max-w-2xl rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="border-b border-[#e6edf5] pb-5">
              <p className="text-sm font-semibold uppercase text-[#f5a623]">
                Masuk
              </p>
              <h1 className="mt-2 text-3xl font-semibold">
                Masuk ke workspace Orbit.
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#6b7890]">
                Login dengan Google, lalu pilih organization yang mau dibuka.
              </p>
            </div>

            {!user ? (
              <div className="grid gap-4 py-5">
                {params.error ? (
                  <div className="rounded-md bg-[#ffecec] px-3 py-2 text-sm font-medium text-[#c73535]">
                    Login belum berhasil. Coba lagi atau cek setup Google di
                    Supabase.
                  </div>
                ) : null}

                <form action={signInWithGoogle}>
                  <input type="hidden" name="next" value={next} />
                  <button className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-[#d7e0ea] bg-white px-4 text-sm font-semibold text-[#172033] transition hover:bg-[#f1f5f9]">
                    <span className="grid size-5 place-items-center rounded-sm bg-[#172033] text-xs font-bold text-white">
                      G
                    </span>
                    Lanjut dengan Google
                  </button>
                </form>

                <p className="text-center text-sm text-[#6b7890]">
                  Belum punya workspace?{" "}
                  <Link
                    href="/auth/sign-up"
                    className="font-semibold text-[#0b6ffb] hover:text-[#075bc9]"
                  >
                    Buat akun dan organization
                  </Link>
                </p>
              </div>
            ) : (
              <div className="py-5">
                <div className="mb-4 flex items-center gap-3 rounded-md border border-[#e6edf5] bg-[#fbfcfe] p-3">
                  <div className="grid size-11 place-items-center rounded-md bg-[#eaf2ff] text-[#075bc9]">
                    <UserCircle className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-[#6b7890]">
                      {user.email}
                    </p>
                  </div>
                </div>

                {organizations.length > 0 ? (
                  <div className="grid gap-3">
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
                              <Building2
                                className="size-5"
                                aria-hidden="true"
                              />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {organization.name}
                            </span>
                            <span className="block truncate text-xs text-[#6b7890]">
                              {organization.role.toLowerCase()} -{" "}
                              {organization.address || organization.timezone}
                            </span>
                          </span>
                          <ArrowRight className="size-4 text-[#536174]" />
                        </button>
                      </form>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-[#d7e0ea] bg-[#fbfcfe] p-5 text-center">
                    <Building2 className="mx-auto mb-3 size-6 text-[#0b6ffb]" />
                    <p className="text-sm font-semibold">
                      Belum ada organization.
                    </p>
                    <p className="mt-1 text-sm text-[#6b7890]">
                      Buat tempat les pertama untuk mulai memakai Orbit.
                    </p>
                  </div>
                )}

                <Link
                  href="/onboarding/create-organization"
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9]"
                >
                  Buat Organization Baru
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
