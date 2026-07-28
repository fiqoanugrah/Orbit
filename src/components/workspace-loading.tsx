import { LoaderCircle } from "lucide-react";

import { OrbitMark } from "@/components/orbit-mark";

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-[#e7edf5] ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-orbit-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

export function WorkspaceLoading({
  contentOnly = false,
  fixed = false,
  message = "Menyiapkan workspace Orbit.",
  submessage = "Sebentar, datanya lagi disusun.",
}: {
  contentOnly?: boolean;
  fixed?: boolean;
  message?: string;
  submessage?: string;
}) {
  if (contentOnly) {
    return (
      <main
        className="fixed bottom-0 left-0 right-0 top-24 z-[90] bg-white/58 px-4 py-6 text-[#172033] backdrop-blur-[2px] md:top-20 md:px-8 lg:left-72"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="grid gap-4 opacity-45 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-md border border-[#dfe6ef] bg-white p-4"
            >
              <SkeletonBlock className="mb-5 h-9 w-9" />
              <SkeletonBlock className="mb-3 h-7 w-24" />
              <SkeletonBlock className="h-3 w-32" />
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 opacity-45 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-md border border-[#dfe6ef] bg-white p-5">
            <SkeletonBlock className="mb-5 h-6 w-44" />
            <div className="grid gap-3">
              {Array.from({ length: 7 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-12 w-full" />
              ))}
            </div>
          </div>
          <div className="rounded-md border border-[#dfe6ef] bg-white p-5">
            <SkeletonBlock className="mb-5 h-6 w-40" />
            <div className="grid gap-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>

        <div className="absolute inset-0 grid place-items-center bg-white/24 px-4">
          <div className="flex max-w-xl flex-col items-center text-center">
            <div className="mb-5 grid size-12 place-items-center rounded-full border border-[#d7e0ea] bg-white shadow-sm">
              <LoaderCircle
                className="size-6 animate-spin text-[#0b6ffb]"
                aria-hidden="true"
              />
            </div>
            <h2 className="text-xl font-semibold text-[#172033]">
              {message}
            </h2>
            <p className="mt-2 text-sm font-medium text-[#6b7890]">
              {submessage}
            </p>
            <div className="mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-[#dbe8fb]">
              <div className="h-full w-1/2 animate-orbit-progress rounded-full bg-[#0b6ffb]" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`${fixed ? "fixed inset-0 z-[100]" : "min-h-screen"} bg-white text-[#172033]`}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-[#dfe6ef] bg-[#132943] px-5 py-5 lg:block">
          <div className="mb-8 flex items-center gap-3">
            <OrbitMark className="size-10" priority />
            <div className="grid flex-1 gap-2">
              <SkeletonBlock className="h-3 w-24 bg-white/24" />
              <SkeletonBlock className="h-3 w-36 bg-white/16" />
            </div>
          </div>

          <div className="grid gap-2">
            {Array.from({ length: 10 }).map((_, index) => (
              <SkeletonBlock
                key={index}
                className={[
                  "h-9 bg-white/14",
                  index === 0 ? "w-full bg-white/24" : "",
                  index % 3 === 1 ? "w-11/12" : "",
                  index % 3 === 2 ? "w-10/12" : "",
                ].join(" ")}
              />
            ))}
          </div>
        </aside>

        <section className="relative flex min-w-0 flex-1 flex-col bg-[#f6f8fb]">
          <header className="border-b border-[#dfe6ef] bg-white px-4 py-4 md:px-8">
            <div className="flex items-center justify-between gap-6">
              <div className="grid min-w-0 flex-1 gap-2">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="h-7 w-64 max-w-full" />
              </div>
              <div className="hidden items-center gap-3 md:flex">
                <SkeletonBlock className="h-10 w-44" />
                <SkeletonBlock className="size-10" />
                <SkeletonBlock className="size-10" />
              </div>
            </div>
          </header>

          <div className="px-4 py-6 md:px-8">
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-md border border-[#dfe6ef] bg-white p-4"
                >
                  <SkeletonBlock className="mb-5 h-9 w-9" />
                  <SkeletonBlock className="mb-3 h-7 w-24" />
                  <SkeletonBlock className="h-3 w-32" />
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <div className="rounded-md border border-[#dfe6ef] bg-white p-5">
                <SkeletonBlock className="mb-5 h-6 w-44" />
                <div className="grid gap-3">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <SkeletonBlock key={index} className="h-12 w-full" />
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-[#dfe6ef] bg-white p-5">
                <SkeletonBlock className="mb-5 h-6 w-40" />
                <div className="grid gap-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <SkeletonBlock key={index} className="h-16 w-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 grid place-items-center bg-white/72 px-4 backdrop-blur-[1px]">
            <div className="flex max-w-xl flex-col items-center text-center">
              <div className="mb-5 grid size-12 place-items-center rounded-full border border-[#d7e0ea] bg-white shadow-sm">
                <LoaderCircle
                  className="size-6 animate-spin text-[#0b6ffb]"
                  aria-hidden="true"
                />
              </div>
              <h2 className="text-xl font-semibold text-[#172033]">
                {message}
              </h2>
              <p className="mt-2 text-sm font-medium text-[#6b7890]">
                {submessage}
              </p>
              <div className="mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-[#dbe8fb]">
                <div className="h-full w-1/2 animate-orbit-progress rounded-full bg-[#0b6ffb]" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
