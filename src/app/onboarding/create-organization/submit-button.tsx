"use client";

import { useFormStatus } from "react-dom";

export function CreateOrganizationSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className="flex h-11 w-full items-center justify-center rounded-md bg-[#0b6ffb] px-4 text-sm font-semibold text-white transition hover:bg-[#075bc9] disabled:cursor-wait disabled:bg-[#7daff5]"
    >
      {pending ? "Membuat organization..." : "Buat dan Masuk Dashboard"}
    </button>
  );
}
