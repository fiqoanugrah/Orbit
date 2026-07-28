import Link from "next/link";
import { Search, X } from "lucide-react";

export function ListSearch({
  clearHref,
  placeholder,
  query,
}: {
  clearHref: string;
  placeholder: string;
  query: string;
}) {
  return (
    <form className="flex flex-col gap-2 pt-4 sm:flex-row">
      <label className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6b7890]"
          aria-hidden="true"
        />
        <span className="sr-only">Search</span>
        <input
          name="q"
          defaultValue={query}
          placeholder={placeholder}
          minLength={2}
          className="h-10 w-full rounded-md border border-[#d7e0ea] bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-[#9aa7b8] focus:border-[#0b6ffb] focus:ring-2 focus:ring-[#0b6ffb]/15"
        />
      </label>
      <button
        type="submit"
        className="h-10 rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9]"
      >
        Search
      </button>
      {query ? (
        <Link
          href={clearHref}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#d7e0ea] bg-white px-3 text-sm font-semibold text-[#536174] transition hover:bg-[#f1f5f9]"
        >
          <X className="size-4" aria-hidden="true" />
          Clear
        </Link>
      ) : null}
    </form>
  );
}
