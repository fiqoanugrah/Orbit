"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function PendingButton({
  children,
  className,
  disabled = false,
  pendingChildren,
}: {
  children: React.ReactNode;
  className: string;
  disabled?: boolean;
  pendingChildren: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      data-pending={pending ? "true" : "false"}
      className={className}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {pendingChildren}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
