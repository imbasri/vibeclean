# Implementasi UploadThing

## Tanggal
2026-03-11

## Deskripsi
Mengintegrasikan UploadThing untuk upload file gambar/dokumen ke VibeClean.

## Alasan
- User meminta integrasi dengan UploadThing
- Perlu upload file untuk profile image, logo organisasi, dan umum
- Sebelumnya menggunakan base64 (tidak scalable)

## Hasil
1. API route `/api/uploadthing` berfungsi
2. Komponen `UploadThingButton` siap pakai
3. SSR hydration dengan NextSSRPlugin
4. Type-safe dengan generateUploadButton

## Endpoint yang Tersedia
- `profileImage` - max 512KB, 1 file (image)
- `organizationLogo` - max 512KB, 1 file (image)
- `general` - max 1MB, 5 files (image/pdf)

## Cara Penggunaan

```tsx
import { UploadThingButton } from "@/components/common/upload-button";

<UploadThingButton
  endpoint="profileImage"
  onUploadComplete={(urls) => {
    console.log("Uploaded:", urls);
  }}
  onUploadError={(error) => {
    console.error(error);
  }}
/>
```
