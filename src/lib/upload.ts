import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const maxUploadSize = 5 * 1024 * 1024;

export async function saveOrganizationPhoto(file: File | null) {
  if (!file || file.size === 0) {
    return null;
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Organization photo must be an image.");
  }

  if (file.size > maxUploadSize) {
    throw new Error("Organization photo must be smaller than 5 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
  const fileName = `${crypto.randomUUID()}.${safeExtension}`;
  const uploadDirectory = path.join(
    process.cwd(),
    "public",
    "uploads",
    "organizations",
  );
  const uploadPath = path.join(uploadDirectory, fileName);

  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(uploadPath, Buffer.from(await file.arrayBuffer()));

  return `/uploads/organizations/${fileName}`;
}
