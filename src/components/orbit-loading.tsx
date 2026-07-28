import Image from "next/image";

export function OrbitLoading({
  contentOnly = false,
  fixed = false,
  message = "LOADING...",
  submessage = "A focused workspace can turn small routines into real progress.",
}: {
  contentOnly?: boolean;
  fixed?: boolean;
  message?: string;
  submessage?: string;
}) {
  const frameClass = contentOnly
    ? "fixed bottom-0 left-0 right-0 top-24 z-[90] lg:left-72 md:top-20"
    : fixed
      ? "fixed inset-0 z-[100]"
      : "min-h-screen";

  return (
    <main
      className={`${frameClass} grid place-items-center bg-white/72 px-6 text-[#172033] backdrop-blur-[2px]`}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex max-w-xl flex-col items-center text-center">
        <div className="relative mb-6 size-40 animate-orbit-float sm:size-48">
          <Image
            src="/orbit-logo.png"
            alt="Orbit"
            fill
            priority
            sizes="192px"
            className="object-contain"
          />
        </div>

        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="size-2 animate-orbit-dot rounded-full bg-[#0b6ffb]" />
          <span className="size-2 animate-orbit-dot rounded-full bg-[#27b9f2] [animation-delay:120ms]" />
          <span className="size-2 animate-orbit-dot rounded-full bg-[#061a4f] [animation-delay:240ms]" />
        </div>

        <h2 className="text-xl font-bold tracking-[0.28em] text-[#6b7890]">
          {message}
        </h2>
        <p className="mt-5 max-w-md text-base font-semibold leading-8 text-[#536174]">
          {submessage}
        </p>
      </div>
    </main>
  );
}
