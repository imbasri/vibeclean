import { UploadProvider, UploadOptions, UploadResult } from "../types";
import { getUploadConfig } from "../config";

const UPLOADTHING_API_URL = "https://uploadthing.com/api/uploadFiles";

const MAX_FILE_SIZE = 500 * 1024; // 500KB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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

export const uploadthingProvider: UploadProvider = {
  name: "uploadthing",
  
  async upload(file: File, options?: UploadOptions): Promise<UploadResult> {
    try {
      const validationError = validateFile(file);
      if (validationError) {
        return { success: false, error: validationError };
      }

      const apiKey = process.env.UPLOADTHING_API_KEY;
      if (!apiKey) {
        console.error("UploadThing API key not configured, falling back to base64");
        return { success: false, error: "UploadThing not configured" };
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", options?.folder || options?.prefix || "uploads");

      const response = await fetch(UPLOADTHING_API_URL, {
        method: "POST",
        headers: {
          "Authorization": apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.files && data.files.length > 0) {
        const uploadedFile = data.files[0];
        return { 
          success: true, 
          url: uploadedFile.url 
        };
      }

      return { success: false, error: "No files returned from UploadThing" };
    } catch (error) {
      console.error("UploadThing upload error:", error);
      const message = error instanceof Error ? error.message : "Failed to upload file";
      return { success: false, error: message };
    }
  },
  
  async uploadMultiple(files: File[], options?: UploadOptions): Promise<UploadResult[]> {
    const results = await Promise.all(
      files.map(file => this.upload(file, options))
    );
    return results;
  }
};
