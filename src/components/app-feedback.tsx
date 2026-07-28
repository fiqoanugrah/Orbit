"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { OrbitLoading } from "@/components/orbit-loading";
import { WorkspaceLoading } from "@/components/workspace-loading";

function isInternalAppHref(href: string) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:")) {
    return false;
  }

  try {
    const url = new URL(href, window.location.href);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export function AppFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendingVariant, setPendingVariant] = useState<
    "dashboard" | "orbit" | null
  >(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setPendingVariant(null);
  }, [pathname, searchParams]);

  useEffect(() => {
    function loadingVariantForPath(path: string) {
      if (path === "/app/dashboard") {
        return "dashboard" as const;
      }

      if (path.startsWith("/app/")) {
        return "orbit" as const;
      }

      return null;
    }

    function startPending(variant: "dashboard" | "orbit") {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      setPendingVariant(variant);
      timeoutRef.current = window.setTimeout(
        () => setPendingVariant(null),
        9000,
      );
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || isModifiedClick(event)) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");

      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      if (!isInternalAppHref(anchor.href)) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      const current = `${window.location.pathname}${window.location.search}`;
      const next = `${nextUrl.pathname}${nextUrl.search}`;
      const variant = loadingVariantForPath(nextUrl.pathname);

      if (next !== current && variant) {
        startPending(variant);
      }
    }

    document.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("click", onClick, true);

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!pendingVariant) {
    return null;
  }

  return pendingVariant === "dashboard" ? (
    <WorkspaceLoading contentOnly fixed />
  ) : (
    <OrbitLoading contentOnly fixed />
  );
}
