export const DEFAULT_CLOUDINARY_CLOUD_NAME = "dpfoo0oew";
export const DEFAULT_CLOUDINARY_UNSIGNED_UPLOAD_PRESET = "icmg_donation_unsigned";
export const DONATION_SLIDE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

const DONATION_SLIDE_UPLOAD_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type CloudinaryUploadEnvKey =
  | "VITE_CLOUDINARY_CLOUD_NAME"
  | "VITE_CLOUDINARY_UNSIGNED_UPLOAD_PRESET";

type CloudinaryUploadEnv = Partial<Record<CloudinaryUploadEnvKey, string | undefined>>;

interface DonationSlideUploadFile {
  name: string;
  size: number;
  type: string;
}

export interface DonationSlideUploadResult {
  public_id: string;
  secure_url: string;
}

const runtimeCloudinaryUploadEnv: CloudinaryUploadEnv =
  typeof import.meta.env === "object" && import.meta.env !== null
    ? {
        VITE_CLOUDINARY_CLOUD_NAME: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
        VITE_CLOUDINARY_UNSIGNED_UPLOAD_PRESET: import.meta.env.VITE_CLOUDINARY_UNSIGNED_UPLOAD_PRESET,
      }
    : {};

function trimEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function validateDonationSlideUploadFile(file: DonationSlideUploadFile) {
  if (!DONATION_SLIDE_UPLOAD_ALLOWED_TYPES.has(file.type)) {
    return "Please choose a JPG, PNG, or WebP image.";
  }

  if (file.size > DONATION_SLIDE_UPLOAD_MAX_BYTES) {
    return "Image must be 5MB or smaller.";
  }

  return null;
}

export function resolveCloudinaryUnsignedUploadConfig(env: CloudinaryUploadEnv = runtimeCloudinaryUploadEnv) {
  return {
    cloudName: trimEnvValue(env.VITE_CLOUDINARY_CLOUD_NAME) ?? DEFAULT_CLOUDINARY_CLOUD_NAME,
    unsignedUploadPreset:
      trimEnvValue(env.VITE_CLOUDINARY_UNSIGNED_UPLOAD_PRESET) ?? DEFAULT_CLOUDINARY_UNSIGNED_UPLOAD_PRESET,
  };
}

export function getDonationSlideUploadEndpoint(cloudName = resolveCloudinaryUnsignedUploadConfig().cloudName) {
  return `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
}

export function getDonationSlideUploadErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Image upload failed. Please try again.";
}

export async function uploadDonationSlideImage(file: File): Promise<DonationSlideUploadResult> {
  const validationError = validateDonationSlideUploadFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const config = resolveCloudinaryUnsignedUploadConfig();
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", config.unsignedUploadPreset);

  const response = await fetch(getDonationSlideUploadEndpoint(config.cloudName), {
    body,
    method: "POST",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "Image upload failed. Please try again.",
    );
  }

  if (
    typeof payload?.secure_url !== "string" ||
    typeof payload?.public_id !== "string"
  ) {
    throw new Error("Image upload finished without a Cloudinary URL.");
  }

  return {
    public_id: payload.public_id,
    secure_url: payload.secure_url,
  };
}
