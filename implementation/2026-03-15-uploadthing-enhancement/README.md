# UploadThing Integration Guide - VibeClean

**Date**: 2026-03-15  
**UploadThing Dashboard**: https://uploadthing.com/dashboard/imbasri-personal-team/ef42buqhm2  
**Folder Structure**: `vibeclean/*`

---

## 📁 File Organization

All files are automatically organized in the `vibeclean` folder with subfolders for each endpoint:

```
vibeclean/
├── profileImage/        # User profile pictures
├── organizationLogo/    # Company and branch logos
├── general/             # General purpose uploads
├── serviceImage/        # Service/product images
├── invoice/             # Invoice and receipt uploads
└── reports/             # Report exports and bulk files
```

---

## 🔧 Available Endpoints

### 1. **profileImage** - User Profile Pictures
- **Max Size**: 512KB
- **Files**: 1 image
- **Formats**: JPG, PNG, WebP, GIF
- **Use Case**: User avatars, profile photos

```typescript
import { UploadDropzone } from '@/utils/uploadthing';

<UploadDropzone
  endpoint="profileImage"
  onClientUploadComplete={(res) => {
    const imageUrl = res?.[0]?.url;
    console.log('Uploaded:', imageUrl);
  }}
  onUploadError={(error: Error) => {
    console.error('Upload failed:', error);
  }}
/>
```

---

### 2. **organizationLogo** - Company Logos
- **Max Size**: 512KB
- **Files**: 1 image
- **Formats**: JPG, PNG, WebP, GIF
- **Use Case**: Organization logos, branch branding

```typescript
<UploadDropzone
  endpoint="organizationLogo"
  onClientUploadComplete={(res) => {
    const logoUrl = res?.[0]?.url;
    // Update organization logo
    await updateOrganization({ logo: logoUrl });
  }}
/>
```

---

### 3. **general** - General Purpose Uploads
- **Max Size**: 2MB (images), 5MB (PDFs)
- **Files**: Up to 10 images or 5 PDFs
- **Formats**: Images (JPG, PNG, WebP, GIF), PDFs
- **Use Case**: Documents, receipts, general files

```typescript
<UploadDropzone
  endpoint="general"
  onClientUploadComplete={(res) => {
    const urls = res.map(file => file.url);
    console.log('Uploaded files:', urls);
  }}
/>
```

---

### 4. **serviceImage** - Service/Product Images
- **Max Size**: 1MB
- **Files**: Up to 5 images
- **Formats**: JPG, PNG, WebP, GIF
- **Use Case**: Service catalog images, product photos

```typescript
<UploadDropzone
  endpoint="serviceImage"
  onClientUploadComplete={(res) => {
    const imageUrls = res.map(file => file.url);
    // Update service images
    await updateService(serviceId, { images: imageUrls });
  }}
/>
```

---

### 5. **invoice** - Invoice & Receipt Uploads
- **Max Size**: 5MB (PDF), 2MB (images)
- **Files**: 1 PDF + 3 images
- **Formats**: PDF, JPG, PNG, WebP
- **Use Case**: Invoice uploads, payment receipts

```typescript
<UploadDropzone
  endpoint="invoice"
  onClientUploadComplete={(res) => {
    const fileUrl = res?.[0]?.url;
    // Attach to invoice
    await uploadInvoiceDocument(invoiceId, fileUrl);
  }}
/>
```

---

### 6. **reports** - Report Exports
- **Max Size**: 10MB
- **Files**: 1 file
- **Formats**: CSV, PDF, Excel (XLSX)
- **Use Case**: Exported reports, bulk data

```typescript
<UploadDropzone
  endpoint="reports"
  onClientUploadComplete={(res) => {
    const reportUrl = res?.[0]?.url;
    // Save report location
    await saveReport({ url: reportUrl });
  }}
/>
```

---

## 🎨 Custom Styling

UploadThing components support custom CSS classes:

```typescript
<UploadDropzone
  endpoint="profileImage"
  className="ut-button:bg-primary ut-button:text-white ut-button:hover:bg-primary/90 ut-label:text-muted-foreground ut-allowed-content:text-muted-foreground/70"
/>
```

### Available Style Targets:
- `ut-button` - Upload button
- `ut-label` - Dropzone label
- `ut-allowed-content` - File type info text
- `ut-dropzone` - Drop zone area
- `ut-spinner` - Loading spinner

---

## 🔐 Security & Authentication

All endpoints require authentication via session token:

```typescript
// The middleware automatically checks for x-session-token header
// Files are only uploaded if user is authenticated
.middleware(async ({ req }) => {
  const session = req.headers.get("x-session-token");
  if (!session) {
    throw new UploadThingError("Unauthorized");
  }
  return { userId: session };
})
```

---

## 📊 Usage Examples

### Example 1: Profile Image Upload in Settings

```typescript
// src/app/(dashboard)/dashboard/settings/page.tsx
import { UploadDropzone } from '@/utils/uploadthing';
import { useProfile } from '@/hooks/use-settings';

function ProfileSettings() {
  const { profile, updateProfile } = useProfile();

  return (
    <UploadDropzone
      endpoint="profileImage"
      onClientUploadComplete={(res) => {
        const imageUrl = res?.[0]?.url;
        if (imageUrl) {
          updateProfile({ image: imageUrl });
          toast.success('Profile image updated!');
        }
      }}
      onUploadError={(error: Error) => {
        toast.error(`Upload failed: ${error.message}`);
      }}
      className="ut-button:bg-primary ut-button:text-white"
    />
  );
}
```

---

### Example 2: Service Images Upload

```typescript
// src/app/(dashboard)/dashboard/services/page.tsx
import { UploadDropzone } from '@/utils/uploadthing';
import { useServiceStore } from '@/stores/service-store';

function ServiceForm({ serviceId }) {
  const { updateService } = useServiceStore();
  const [images, setImages] = useState<string[]>([]);

  return (
    <UploadDropzone
      endpoint="serviceImage"
      onClientUploadComplete={(res) => {
        const imageUrls = res.map(file => file.url);
        const newImages = [...images, ...imageUrls];
        setImages(newImages);
        updateService(serviceId, { images: newImages });
      }}
      onUploadError={(error) => {
        toast.error('Failed to upload image');
      }}
    />
  );
}
```

---

### Example 3: Invoice Document Upload

```typescript
// src/app/(dashboard)/dashboard/billing/page.tsx
import { UploadDropzone } from '@/utils/uploadthing';

function InvoiceUpload({ invoiceId }) {
  const handleUpload = async (res) => {
    const fileUrl = res?.[0]?.url;
    if (fileUrl) {
      // Upload to backend
      await fetch(`/api/billing/invoice/${invoiceId}/document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fileUrl }),
      });
      toast.success('Document uploaded');
    }
  };

  return (
    <UploadDropzone
      endpoint="invoice"
      onClientUploadComplete={handleUpload}
      onUploadError={(error) => {
        toast.error('Upload failed');
      }}
    />
  );
}
```

---

## 🔄 Migration Guide

### Updating Existing Upload Components

**Before:**
```typescript
<input
  type="file"
  accept="image/*"
  onChange={handleFileChange}
/>
```

**After:**
```typescript
<UploadDropzone
  endpoint="profileImage"
  onClientUploadComplete={(res) => {
    const url = res?.[0]?.url;
    // Handle uploaded URL
  }}
  onUploadError={(error) => {
    toast.error(error.message);
  }}
/>
```

---

## 📝 Best Practices

1. **Always handle errors**: Show user-friendly error messages
2. **Show loading states**: UploadThing provides built-in loading indicators
3. **Validate before upload**: Check file size/type client-side when possible
4. **Optimize images**: Compress images before upload for better performance
5. **Use appropriate endpoints**: Match file types to the correct endpoint
6. **Store URLs in database**: Save uploaded file URLs for future reference

---

## 🎯 File Limits Summary

| Endpoint | Max File Size | Max Files | Total Max |
|----------|--------------|-----------|-----------|
| profileImage | 512KB | 1 | 512KB |
| organizationLogo | 512KB | 1 | 512KB |
| general | 2MB (img) / 5MB (pdf) | 10 img / 5 pdf | 20MB / 25MB |
| serviceImage | 1MB | 5 | 5MB |
| invoice | 5MB (pdf) / 2MB (img) | 1 pdf / 3 img | 11MB |
| reports | 10MB | 1 | 10MB |

---

## 🔗 Useful Links

- **UploadThing Dashboard**: https://uploadthing.com/dashboard/imbasri-personal-team/ef42buqhm2
- **Official Docs**: https://docs.uploadthing.com
- **Next.js App Router Guide**: https://docs.uploadthing.com/getting-started/appdir
- **React Components**: https://docs.uploadthing.com/getting-started/react

---

## 🛠️ Troubleshooting

### Issue: "Unauthorized" Error
**Solution**: Ensure user is authenticated and session token is passed

### Issue: File Too Large
**Solution**: Compress file or use appropriate endpoint with higher limits

### Issue: Wrong File Type
**Solution**: Check endpoint supports the file type you're uploading

### Issue: Upload Fails Silently
**Solution**: Check browser console and network tab for errors

---

**Last Updated**: 2026-03-15  
**Maintained by**: VibeClean Team
