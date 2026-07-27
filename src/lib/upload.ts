import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const maxUploadSize = 5 * 1024 * 1024;
const organizationAssetsBucket = "organization-assets";

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
) {
  const supabase = getSupabaseStorageClient();

  if (!supabase) {
    return null;
  }

  await ensureOrganizationAssetsBucket(supabase);

  const objectPath = `organizations/${organizationId}/${crypto.randomUUID()}.${safeExtension}`;
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

async function saveToLocalUploads(buffer: Buffer, safeExtension: string) {
  const fileName = `${crypto.randomUUID()}.${safeExtension}`;
  const uploadDirectory = path.join(
    process.cwd(),
    "public",
    "uploads",
    "organizations",
  );
  const uploadPath = path.join(uploadDirectory, fileName);

  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(uploadPath, buffer);

  return `/uploads/organizations/${fileName}`;
}

export async function saveOrganizationPhoto(
  file: File | null,
  organizationId: string,
) {
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
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
  const storageUrl = await saveToSupabaseStorage(
    file,
    buffer,
    safeExtension,
    organizationId,
  );

  if (storageUrl) {
    return storageUrl;
  }

  try {
    return await saveToLocalUploads(buffer, safeExtension);
  } catch {
    return null;
  }
}
