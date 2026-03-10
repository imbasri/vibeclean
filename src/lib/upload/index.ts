import { UploadProvider, UploadProviderType, UploadOptions, UploadResult } from "./types";
import { getProviderFromEnv } from "./config";
import { uploadthingProvider } from "./providers/uploadthing";
import { base64Provider } from "./providers/base64";

const providers: Record<UploadProviderType, UploadProvider> = {
  uploadthing: uploadthingProvider,
  googledrive: base64Provider, // Placeholder - not implemented yet
  s3: base64Provider,          // Placeholder - not implemented yet
  r2: base64Provider,          // Placeholder - not implemented yet
  base64: base64Provider,
};

export function getUploader(): UploadProvider {
  const providerName = getProviderFromEnv();
  return providers[providerName] || providers.base64;
}

export function getProviderName(): string {
  return getUploader().name;
}

export { uploadthingProvider, base64Provider };
export type { UploadProvider, UploadOptions, UploadResult, UploadProviderType };
