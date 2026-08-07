import { getAuthenticatedAgent } from "@/services/auth.service";
import { requireIdentityVerification } from "@/lib/atproto/verification-guard";
import { clearProfileCache, getActorProfile } from "@/lib/atproto/profile";

export const PROFILE_DISPLAY_NAME_LIMIT = 64;
export const PROFILE_BIO_LIMIT = 2560;
export const PROFILE_IMAGE_MAX_BYTES = 1_000_000;

export interface ProfileUpdateInput {
  displayName: string;
  description: string;
  avatar?: File | null;
  banner?: File | null;
}

function countCharacters(value: string): number {
  return Array.from(value).length;
}

function validateText(input: ProfileUpdateInput) {
  const displayName = input.displayName.trim();
  const description = input.description.trim();

  if (countCharacters(displayName) > PROFILE_DISPLAY_NAME_LIMIT) {
    throw new Error(
      `Le nom d’affichage ne peut pas dépasser ${PROFILE_DISPLAY_NAME_LIMIT} caractères.`
    );
  }

  if (countCharacters(description) > PROFILE_BIO_LIMIT) {
    throw new Error(
      `La bio ne peut pas dépasser ${PROFILE_BIO_LIMIT} caractères.`
    );
  }

  return { displayName, description };
}

function normalizeMimeType(value: string): string {
  return value.split(";", 1)[0].trim().toLowerCase();
}

async function optimizeProfileImage(file: File): Promise<{
  bytes: Uint8Array;
  mimeType: string;
}> {
  const sourceType = normalizeMimeType(file.type);

  if (!["image/jpeg", "image/png", "image/webp"].includes(sourceType)) {
    throw new Error("Utilisez une image JPEG, PNG ou WebP.");
  }

  if (file.size <= PROFILE_IMAGE_MAX_BYTES) {
    return {
      bytes: new Uint8Array(await file.arrayBuffer()),
      mimeType: sourceType,
    };
  }

  if (typeof window === "undefined" || typeof createImageBitmap === "undefined") {
    throw new Error("Cette image est trop volumineuse. Choisissez une image de moins de 1 Mo.");
  }

  const bitmap = await createImageBitmap(file);
  const maxDimension = 1600;
  const ratio = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Impossible de préparer cette image.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const qualities = [0.9, 0.8, 0.7, 0.6, 0.5];

  for (const quality of qualities) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );

    if (blob && blob.size <= PROFILE_IMAGE_MAX_BYTES) {
      return {
        bytes: new Uint8Array(await blob.arrayBuffer()),
        mimeType: "image/jpeg",
      };
    }
  }

  throw new Error("Cette image reste trop volumineuse après optimisation. Choisissez une image plus petite.");
}

async function uploadProfileImage(agent: any, file: File) {
  const prepared = await optimizeProfileImage(file);
  const uploaded = await agent.uploadBlob(prepared.bytes, {
    encoding: prepared.mimeType,
  });

  return uploaded.data.blob;
}

export async function updateOwnProfile(input: ProfileUpdateInput) {
  await requireIdentityVerification();

  const { agent, session } = await getAuthenticatedAgent();
  const { displayName, description } = validateText(input);

  let existingRecord: any = {};

  try {
    const response = await agent.api.com.atproto.repo.getRecord({
      repo: session.did,
      collection: "app.bsky.actor.profile",
      rkey: "self",
    });
    existingRecord = response.data.value || {};
  } catch (error: any) {
    const status = error?.status || error?.response?.status;
    if (status !== 404) {
      throw error;
    }
  }

  const [avatar, banner] = await Promise.all([
    input.avatar ? uploadProfileImage(agent, input.avatar) : Promise.resolve(undefined),
    input.banner ? uploadProfileImage(agent, input.banner) : Promise.resolve(undefined),
  ]);

  const value: Record<string, unknown> = {
    ...existingRecord,
    $type: "app.bsky.actor.profile",
    displayName,
    description,
  };

  if (avatar) value.avatar = avatar;
  if (banner) value.banner = banner;

  await agent.api.com.atproto.repo.putRecord({
    repo: session.did,
    collection: "app.bsky.actor.profile",
    rkey: "self",
    record: value,
    validate: true,
  });

  clearProfileCache(session.handle);
  clearProfileCache(session.did);

  try {
    return await getActorProfile(session.did);
  } catch {
    return {
      did: session.did,
      handle: session.handle,
      displayName,
      description,
    };
  }
}
