"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  activeOrganizationCookie,
  requireActiveMembership,
  requireActiveOrganization,
} from "@/lib/organization";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/roles";
import { saveOrganizationPhoto, UploadError } from "@/lib/upload";

function getSafeRedirectPath(value: FormDataEntryValue | null) {
  const redirectTo = String(value ?? "/app/dashboard").trim();

  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return "/app/dashboard";
  }

  return redirectTo;
}

function withStatusParam(path: string, key: string, value: string) {
  const url = new URL(path, "http://orbit.local");
  url.searchParams.set(key, value);

  return `${url.pathname}${url.search}`;
}

export async function switchOrganization(formData: FormData) {
  const user = await requireCurrentUser("/auth/sign-in");
  const organizationId = String(formData.get("organizationId") ?? "");
  const redirectTo = getSafeRedirectPath(formData.get("redirectTo"));
  const membership = await prisma.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: user.id,
      },
    },
    select: { organizationId: true },
  });

  if (!membership) {
    redirect("/auth/sign-in?error=organization");
  }

  const cookieStore = await cookies();
  cookieStore.set(activeOrganizationCookie, membership.organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect(redirectTo);
}

export async function deleteOrganization(formData: FormData) {
  const user = await requireCurrentUser("/auth/sign-in");
  const organizationId = String(formData.get("organizationId") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  const redirectTo = getSafeRedirectPath(formData.get("redirectTo"));

  const membership = await prisma.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: user.id,
      },
    },
    include: {
      organization: {
        select: { id: true, name: true },
      },
    },
  });

  if (!membership || membership.role !== "OWNER") {
    redirect("/auth/sign-in?error=delete");
  }

  if (confirmation !== membership.organization.name) {
    redirect(withStatusParam(redirectTo, "error", "delete-confirmation"));
  }

  await prisma.organization.delete({
    where: { id: membership.organization.id },
  });

  const cookieStore = await cookies();
  if (cookieStore.get(activeOrganizationCookie)?.value === organizationId) {
    const nextMembership = await prisma.membership.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
      orderBy: { createdAt: "asc" },
    });

    if (nextMembership) {
      cookieStore.set(activeOrganizationCookie, nextMembership.organizationId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    } else {
      cookieStore.delete(activeOrganizationCookie);
      redirect("/onboarding/create-organization?deleted=1");
    }
  }

  redirect(withStatusParam(redirectTo, "deleted", "1"));
}

export async function updateOrganizationProfile(formData: FormData) {
  const organization = await requireActiveOrganization();
  const membership = await requireActiveMembership(organization.id);

  if (!hasOrganizationPermission(membership, "organization.profile.manage")) {
    redirect("/app/profile?error=permission");
  }

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "Asia/Jakarta").trim();
  const photo = formData.get("photo");
  let photoUrl: string | null;

  if (name.length < 2) {
    redirect("/app/profile?error=name");
  }

  try {
    photoUrl = await saveOrganizationPhoto(
      photo instanceof File ? photo : null,
      organization.id,
    );
  } catch (error) {
    if (error instanceof UploadError) {
      redirect("/app/profile?error=photo");
    }

    throw error;
  }

  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      name,
      phone: phone || null,
      email: email || null,
      address: address || null,
      timezone: timezone || "Asia/Jakarta",
      ...(photoUrl ? { photoUrl } : {}),
    },
  });

  redirect("/app/profile?updated=1");
}
