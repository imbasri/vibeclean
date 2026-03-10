import { UploadProviderType, UploadConfig } from "./types";

const DEFAULT_MAX_FILE_SIZE = 500 * 1024; // 500KB
const DEFAULT_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function getUploadConfig(): UploadConfig {
  const provider = (process.env.UPLOAD_PROVIDER as UploadProviderType) || "base64";
  
  return {
    provider,
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
    allowedTypes: DEFAULT_ALLOWED_TYPES,
  };
}

export function getProviderFromEnv(): UploadProviderType {
  return (process.env.UPLOAD_PROVIDER as UploadProviderType) || "base64";
}
