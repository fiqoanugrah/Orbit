import Image from "next/image";

import { cn } from "@/lib/utils";

export function OrbitMark({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-[#dfe6ef]",
        className ?? "size-10",
      )}
      aria-hidden="true"
    >
      <Image
        src="/orbit-logo.png"
        alt=""
        fill
        priority={priority}
        sizes="64px"
        className="object-contain p-1"
      />
    </span>
  );
}
