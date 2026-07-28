import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

import { signInAsDevUser, signInWithGoogle } from "@/app/auth/actions";
import { OrbitMark } from "@/components/orbit-mark";
import { getCurrentUser } from "@/lib/auth";
import { isDevAuthEnabled } from "@/lib/dev-auth";
import { PendingButton } from "@/components/pending-button";

export const dynamic = "force-dynamic";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const canUseDevLogin = isDevAuthEnabled();

  if (user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f8fb] px-4 text-[#172033]">
        <section className="w-full max-w-md rounded-md border border-[#dfe6ef] bg-white p-6 text-center shadow-sm">
          <OrbitMark className="mx-auto size-12" priority />
          <h1 className="mt-5 text-2xl font-semibold">
            Akun kamu sudah siap.
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#6b7890]">
            Lanjut buat organization tempat les untuk masuk ke dashboard.
          </p>
          <Link
            href="/onboarding/create-organization"
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9]"
          >
            Buat organization
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#172033]">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-4 py-8 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex flex-col justify-between rounded-md border border-[#dfe6ef] bg-white p-6 shadow-sm">
          <div>
            <Link
              href="/"
              className="mb-8 inline-flex h-10 items-center gap-2 rounded-md border border-[#d7e0ea] px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Kembali
            </Link>
            <OrbitMark className="size-12" priority />
            <h1 className="mt-5 text-3xl font-semibold leading-tight">
              Buat akun Orbit untuk tempat les kamu.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#536174]">
              Mulai dari akun Google, lalu buat organization pertama. Setelah
              itu dashboard langsung siap dipakai.
            </p>
          </div>

          <div className="mt-8 space-y-3 border-t border-[#e6edf5] pt-5">
            {[
              "Login aman lewat Supabase Auth",
              "Satu akun bisa punya beberapa organization",
              "Dashboard langsung tersambung ke database",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <CheckCircle2
                  className="size-4 text-[#16834a]"
                  aria-hidden
                />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
            <div className="border-b border-[#e6edf5] pb-5">
              <p className="text-sm font-semibold uppercase text-[#f5a623]">
                Sign up
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Lanjut dengan Google
              </h2>
              <p className="mt-2 text-sm text-[#6b7890]">
                Setelah Google login berhasil, kamu akan diarahkan ke setup
                organization.
              </p>
            </div>

            <div className="grid gap-4 pt-5">
              {params.error ? (
                <div className="rounded-md bg-[#ffecec] px-3 py-2 text-sm font-medium text-[#c73535]">
                  Sign up belum berhasil. Coba lagi atau cek setup Google di
                  Supabase.
                </div>
              ) : null}

              <form action={signInWithGoogle}>
                <input
                  type="hidden"
                  name="next"
                  value="/onboarding/create-organization"
                />
                <PendingButton
                  className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-[#d7e0ea] bg-white px-4 text-sm font-semibold text-[#172033] transition hover:bg-[#f1f5f9] disabled:cursor-wait disabled:opacity-70"
                  pendingChildren="Membuka Google..."
                >
                  <span className="grid size-5 place-items-center rounded-sm bg-[#172033] text-xs font-bold text-white">
                    G
                  </span>
                  Sign up dengan Google
                </PendingButton>
              </form>

              {canUseDevLogin ? (
                <form action={signInAsDevUser}>
                  <input
                    type="hidden"
                    name="next"
                    value="/onboarding/create-organization"
                  />
                  <PendingButton
                    className="flex h-11 w-full items-center justify-center rounded-md bg-[#172033] px-4 text-sm font-semibold text-white transition hover:bg-[#25324a] disabled:cursor-wait disabled:bg-[#536174]"
                    pendingChildren="Masuk..."
                  >
                    Masuk local dev
                  </PendingButton>
                </form>
              ) : null}

              <p className="text-center text-sm text-[#6b7890]">
                Sudah punya akun?{" "}
                <Link
                  href="/auth/sign-in"
                  className="font-semibold text-[#0b6ffb] hover:text-[#075bc9]"
                >
                  Masuk
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
