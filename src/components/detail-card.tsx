import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronUp } from "lucide-react";

export function DetailCard({
  children,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="min-w-0 rounded-md border border-[#dfe6ef] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[#e6edf5] pb-4">
        <div className="flex items-center gap-3">
          <Icon className="size-5 text-[#0b6ffb]" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-[#0b6ffb]">{title}</h2>
        </div>
        <ChevronUp className="size-5 text-[#27b9f2]" aria-hidden="true" />
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

export function DetailField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-[#9aa7b8]">{label}</p>
      <div className="mt-2 min-w-0 text-sm font-semibold text-[#172033]">
        {value || "-"}
      </div>
    </div>
  );
}
