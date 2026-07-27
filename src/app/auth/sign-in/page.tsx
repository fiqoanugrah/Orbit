import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  ChevronRight,
  LogOut,
  Plus,
  Trash2,
  UserCircle,
} from "lucide-react";

import { deleteOrganization, switchOrganization } from "@/app/app/actions";
import { signInWithGoogle, signOut } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth";
import { getOrganizationsForUser } from "@/lib/organization";

export const dynamic = "force-dynamic";

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const organizations = user ? await getOrganizationsForUser(user.id) : [];
  const next = params.next ?? "/auth/sign-in";

  if (user && organizations.length === 0) {
    redirect("/onboarding/create-organization");
  }

  if (!user) {
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
              href="/auth/sign-up"
              className="flex h-10 items-center gap-2 rounded-md bg-[#0b6ffb] px-3 text-sm font-semibold text-white transition hover:bg-[#075bc9]"
            >
              <Plus className="size-4" aria-hidden="true" />
              Sign up
            </Link>
          </header>

          <section className="grid flex-1 place-items-center py-10">
            <div className="w-full max-w-md rounded-md border border-[#dfe6ef] bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase text-[#f5a623]">
                Masuk
              </p>
              <h1 className="mt-2 text-3xl font-semibold">
                Masuk ke Orbit.
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#6b7890]">
                Login dengan Google untuk memilih atau membuat organization.
              </p>

              {params.error ? (
                <div className="mt-5 rounded-md bg-[#ffecec] px-3 py-2 text-sm font-medium text-[#c73535]">
                  Login belum berhasil. Coba lagi atau cek setup Google di
                  Supabase.
                </div>
              ) : null}

              <form action={signInWithGoogle} className="mt-5">
                <input type="hidden" name="next" value={next} />
                <button className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-[#d7e0ea] bg-white px-4 text-sm font-semibold text-[#172033] transition hover:bg-[#f1f5f9]">
                  <span className="grid size-5 place-items-center rounded-sm bg-[#172033] text-xs font-bold text-white">
                    G
                  </span>
                  Lanjut dengan Google
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-[#172033]">
      <div className="h-9 bg-[#35bfd0]" />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-[#0b6ffb] text-sm font-bold text-white">
            O
          </span>
          <span className="text-lg font-semibold">Orbit</span>
        </Link>
        <form action={signOut}>
          <button className="flex h-10 items-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]">
            <LogOut className="size-4" aria-hidden="true" />
            Keluar
          </button>
        </form>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div className="hidden w-44 shrink-0 items-center justify-center md:flex">
            <div className="grid size-28 place-items-center rounded-full bg-[#e7fbfb] text-[#35bfd0]">
              <Building2 className="size-12" aria-hidden="true" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-semibold">
              Welcome {getFirstName(user.name)}
            </h1>
            <p className="mt-2 text-2xl font-semibold leading-tight text-black">
              You&apos;re almost there! Just select or create an organization
              to get going.
            </p>
            <div className="mt-4 flex items-center gap-3 rounded-md border border-[#dfe6ef] bg-[#fbfcfe] px-3 py-2 text-sm text-[#536174]">
              <UserCircle className="size-5 text-[#0b6ffb]" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-[#172033]">
                  {user.name}
                </span>
                <span className="block truncate text-xs">{user.email}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2 lg:max-w-5xl lg:grid-cols-3">
          <Link
            href="/onboarding/create-organization"
            className="grid min-h-40 place-items-center rounded-md border-2 border-dashed border-[#172033] bg-white p-5 text-center text-base font-semibold transition hover:border-[#0b6ffb] hover:bg-[#eef5ff] hover:text-[#075bc9]"
          >
            <span className="flex items-center gap-2">
              <Plus className="size-5" aria-hidden="true" />
              New Organization
            </span>
          </Link>

          {params.deleted ? (
            <div className="rounded-md border border-[#c8ead8] bg-[#f1fbf6] p-4 text-sm font-semibold text-[#16834a] sm:col-span-2 lg:col-span-3">
              Organization berhasil dihapus.
            </div>
          ) : null}

          {params.error === "delete" ? (
            <div className="rounded-md border border-[#f4c6c6] bg-[#fff4f4] p-4 text-sm font-semibold text-[#c73535] sm:col-span-2 lg:col-span-3">
              Hanya owner yang bisa menghapus organization.
            </div>
          ) : null}

          {organizations.map((organization) => (
            <article
              key={organization.id}
              className="flex min-h-40 flex-col rounded-md border border-[#dfe6ef] bg-white p-4 shadow-sm transition hover:border-[#35bfd0] hover:shadow-md"
            >
              <form action={switchOrganization}>
                <input
                  type="hidden"
                  name="organizationId"
                  value={organization.id}
                />
                <button className="flex w-full flex-col text-left">
                  <span className="flex w-full items-start gap-3">
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
                      <span className="block truncate text-base font-semibold text-[#25324a]">
                        {organization.name}
                      </span>
                      <span className="mt-1 inline-flex rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-semibold text-[#075bc9]">
                        {formatRole(organization.role)}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-[#6b7890]" />
                  </span>
                  <span className="mt-4 line-clamp-2 text-sm leading-6 text-[#536174]">
                    {organization.address || organization.timezone}
                  </span>
                </button>
              </form>

              {organization.role === "OWNER" ? (
                <details className="mt-auto pt-4">
                  <summary className="cursor-pointer text-xs font-semibold text-[#c73535]">
                    Delete organization
                  </summary>
                  <form action={deleteOrganization} className="mt-3 grid gap-2">
                    <input
                      type="hidden"
                      name="organizationId"
                      value={organization.id}
                    />
                    <p className="text-xs leading-5 text-[#6b7890]">
                      Ini akan menghapus workspace dan semua data di dalamnya.
                    </p>
                    <button className="flex h-9 items-center justify-center gap-2 rounded-md border border-[#f4c6c6] bg-white px-3 text-xs font-semibold text-[#c73535] transition hover:bg-[#fff4f4]">
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Delete
                    </button>
                  </form>
                </details>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
