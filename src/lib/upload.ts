import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const maxUploadSize = 5 * 1024 * 1024;
const organizationAssetsBucket = "organization-assets";

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

export function validatePhotoFile(file: File | null, errorLabel: string) {
  if (!file || file.size === 0) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    throw new UploadError(`${errorLabel} photo must be an image.`);
  }

  if (file.size > maxUploadSize) {
    throw new UploadError(`${errorLabel} photo must be smaller than 5 MB.`);
  }
}

function getSupabaseStorageClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function ensureOrganizationAssetsBucket(
  supabase: NonNullable<ReturnType<typeof getSupabaseStorageClient>>,
) {
  const { data } = await supabase.storage.getBucket(organizationAssetsBucket);

  if (data) {
    return;
  }

  const { error } = await supabase.storage.createBucket(
    organizationAssetsBucket,
    {
      public: true,
      fileSizeLimit: maxUploadSize,
      allowedMimeTypes: ["image/*"],
    },
  );

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw error;
  }
}

async function saveToSupabaseStorage(
  file: File,
  buffer: Buffer,
  safeExtension: string,
  organizationId: string,
  folder = "organizations",
) {
  const supabase = getSupabaseStorageClient();

  if (!supabase) {
    return null;
  }

  await ensureOrganizationAssetsBucket(supabase);

  const objectPath = `${folder}/${organizationId}/${crypto.randomUUID()}.${safeExtension}`;
  const { error } = await supabase.storage
    .from(organizationAssetsBucket)
    .upload(objectPath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from(organizationAssetsBucket)
    .getPublicUrl(objectPath);

  return data.publicUrl;
}

async function saveToLocalUploads(
  buffer: Buffer,
  safeExtension: string,
  folder = "organizations",
) {
  const fileName = `${crypto.randomUUID()}.${safeExtension}`;
  const uploadDirectory = path.join(
    process.cwd(),
    "public",
    "uploads",
    folder,
  );
  const uploadPath = path.join(uploadDirectory, fileName);

  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(uploadPath, buffer);

  return `/uploads/${folder}/${fileName}`;
}

async function savePhoto({
  errorLabel,
  file,
  folder,
  organizationId,
}: {
  errorLabel: string;
  file: File | null;
  folder?: string;
  organizationId: string;
}) {
  if (!file || file.size === 0) {
    return null;
  }

  validatePhotoFile(file, errorLabel);

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
  const storageUrl = await saveToSupabaseStorage(
    file,
    buffer,
    safeExtension,
    organizationId,
    folder,
  );

  if (storageUrl) {
    return storageUrl;
  }

  try {
    return await saveToLocalUploads(buffer, safeExtension, folder);
  } catch {
    return null;
  }
}

export async function saveOrganizationPhoto(
  file: File | null,
  organizationId: string,
) {
  return savePhoto({
    errorLabel: "Organization",
    file,
    folder: "organizations",
    organizationId,
  });
}

export async function saveStudentPhoto(file: File | null, organizationId: string) {
  return savePhoto({
    errorLabel: "Student",
    file,
    folder: "students",
    organizationId,
  });
}

export async function saveTeacherPhoto(file: File | null, organizationId: string) {
  return savePhoto({
    errorLabel: "Teacher",
    file,
    folder: "teachers",
    organizationId,
  });
}
