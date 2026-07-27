import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const maxUploadSize = 5 * 1024 * 1024;

function shouldUseInlineUpload() {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

async function createInlineImageUrl(file: File, buffer: Buffer) {
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

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

  const buffer = Buffer.from(await file.arrayBuffer());

  if (shouldUseInlineUpload()) {
    return createInlineImageUrl(file, buffer);
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

  try {
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(uploadPath, buffer);
  } catch {
    return createInlineImageUrl(file, buffer);
  }

  return `/uploads/organizations/${fileName}`;
}
