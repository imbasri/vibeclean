import { UploadProvider, UploadOptions, UploadResult } from "../types";
import { getUploadConfig } from "../config";

const MAX_FILE_SIZE = 500 * 1024; // 500KB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function validateFile(file: File): string | null {
  const config = getUploadConfig();
  
  if (!config.allowedTypes.includes(file.type)) {
    return `File type not allowed. Use: ${config.allowedTypes.join(", ")}`;
  }
  
  if (file.size > config.maxFileSize) {
    return `File too large. Maximum ${Math.round(config.maxFileSize / 1024)}KB`;
  }
  
  return null;
}

export const base64Provider: UploadProvider = {
  name: "base64",
  
  async upload(file: File, _options?: UploadOptions): Promise<UploadResult> {
    try {
      const validationError = validateFile(file);
      if (validationError) {
        return { success: false, error: validationError };
      }

      const arrayBuffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      const dataUrl = `data:${file.type};base64,${base64}`;

      return { success: true, url: dataUrl };
    } catch (error) {
      console.error("Base64 upload error:", error);
      return { success: false, error: "Failed to upload file" };
    }
  },
  
  async uploadMultiple(files: File[], options?: UploadOptions): Promise<UploadResult[]> {
    const results = await Promise.all(
      files.map(file => this.upload(file, options))
    );
    return results;
  }
};
