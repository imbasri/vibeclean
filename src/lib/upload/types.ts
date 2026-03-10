export interface UploadOptions {
  folder?: string;
  prefix?: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface UploadProvider {
  readonly name: string;
  upload(file: File, options?: UploadOptions): Promise<UploadResult>;
  uploadMultiple?(files: File[], options?: UploadOptions): Promise<UploadResult[]>;
}

export type UploadProviderType = "uploadthing" | "googledrive" | "s3" | "r2" | "base64";

export interface UploadConfig {
  provider: UploadProviderType;
  maxFileSize: number;
  allowedTypes: string[];
}
