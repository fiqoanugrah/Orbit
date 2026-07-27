import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function AuthCodeErrorPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f8fb] px-4 text-[#172033]">
      <section className="w-full max-w-md rounded-md border border-[#dfe6ef] bg-white p-6 text-center shadow-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-md bg-[#ffecec] text-[#c73535]">
          <AlertCircle className="size-5" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">Login belum berhasil.</h1>
        <p className="mt-2 text-sm leading-6 text-[#6b7890]">
          Coba masuk lagi. Kalau masih gagal, pastikan Google provider dan
          redirect URL sudah aktif di Supabase.
        </p>
        <Link
          href="/auth/sign-in"
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Kembali ke login
        </Link>
      </section>
    </main>
  );
}
