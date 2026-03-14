# Dynamic Upload Service Abstraction

**Date:** March 2026
**Status:** Completed

## Overview

Implemented a dynamic upload service abstraction layer that allows switching between different storage providers without changing application code. Just change an environment variable to switch providers.

## Architecture

### Provider Pattern

```
src/lib/upload/
├── types.ts              # Interface definitions
├── config.ts            # Environment configuration
├── index.ts             # Factory: getUploader()
└── providers/
    ├── uploadthing.ts   # UploadThing implementation
    └── base64.ts        # Base64 fallback (development)
```

## How to Switch Providers

### 1. UploadThing (Production)

```env
UPLOAD_PROVIDER=uploadthing
UPLOADTHING_API_KEY=sk_live_xxx
```

### 2. Google Drive (Future)

```env
UPLOAD_PROVIDER=googledrive
GOOGLE_DRIVE_CLIENT_ID=xxx
GOOGLE_DRIVE_CLIENT_SECRET=xxx
```

### 3. AWS S3 / Cloudflare R2 (Future)

```env
UPLOAD_PROVIDER=s3
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=auto
AWS_BUCKET=xxx
```

### 4. Base64 (Development/Fallback)

```env
UPLOAD_PROVIDER=base64
```

## Files Created

```
src/lib/upload/
├── types.ts           # UploadProvider, UploadResult, UploadOptions interfaces
├── config.ts         # getUploadConfig(), getProviderFromEnv()
├── index.ts          # Factory: getUploader(), getProviderName()
└── providers/
    ├── uploadthing.ts  # UploadThing provider implementation
    └── base64.ts      # Base64 provider (fallback)

src/app/api/uploadthing/
├── core.ts           # FileRouter definitions
└── route.ts          # API route handler

src/app/actions/
└── upload.ts         # Updated to use factory
```

## Files Modified

```
.env.local            # Added UPLOAD_PROVIDER and UPLOADTHING_API_KEY config
```

## Current Configuration

The system currently defaults to `base64` provider. To switch to UploadThing:

1. Get your UploadThing API key from https://uploadthing.com/dashboard
2. Uncomment and update `.env.local`:
   ```
   UPLOAD_PROVIDER=uploadthing
   UPLOADTHING_API_KEY=sk_live_xxx
   ```
3. Restart the development server

## Provider Features

| Provider | Status | Notes |
|----------|--------|-------|
| base64 | ✅ Ready | Default, stores as data URL |
| uploadthing | ✅ Ready | Production grade |
| googledrive | 🔄 Placeholder | Not implemented yet |
| s3 | 🔄 Placeholder | Not implemented yet |
| r2 | 🔄 Placeholder | Alias for S3 |

## Interface

```typescript
interface UploadProvider {
  readonly name: string;
  upload(file: File, options?: UploadOptions): Promise<UploadResult>;
  uploadMultiple?(files: File[], options?: UploadOptions): Promise<UploadResult[]>;
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

interface UploadOptions {
  folder?: string;
  prefix?: string;
}
```

## Usage

```typescript
import { getUploader } from "@/lib/upload";

const uploader = getUploader();

// Upload single file
const result = await uploader.upload(file, { folder: "profiles" });

// Upload multiple files
if (uploader.uploadMultiple) {
  const results = await uploader.uploadMultiple(files, { folder: "uploads" });
}
```

## Notes

- File validation (type, size) is handled by each provider
- Default max file size: 500KB
- Allowed types: JPEG, PNG, WebP, GIF
- Providers can be extended by creating new files in `providers/`

## Adding New Provider

To add a new provider (e.g., Google Drive):

1. Create `src/lib/upload/providers/googledrive.ts`
2. Implement the `UploadProvider` interface
3. Export the provider
4. Add to `src/lib/upload/index.ts` providers map
5. Add environment variables to `.env.local`

## Future Improvements

1. Implement Google Drive provider
2. Implement AWS S3 / Cloudflare R2 provider
3. Add progress callback support
4. Add file deletion support
5. Add multiple endpoint support (profileImage, organizationLogo, etc.)
