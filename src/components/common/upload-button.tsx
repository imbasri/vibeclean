"use client";

import { UploadButton } from "../../utils/uploadthing";
import { toast } from "sonner";

interface UploadThingButtonProps {
  endpoint: "profileImage" | "organizationLogo" | "general";
  onUploadComplete?: (urls: string[]) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
}

export function UploadThingButton({
  endpoint,
  onUploadComplete,
  onUploadError,
  className,
}: UploadThingButtonProps) {
  return (
    <UploadButton
      endpoint={endpoint}
      onClientUploadComplete={(res) => {
        const urls = res.map((r: { url: string }) => r.url);
        onUploadComplete?.(urls);
      }}
      onUploadError={(error: Error) => {
        toast.error(`Upload failed: ${error.message}`);
        onUploadError?.(error);
      }}
      className={className}
    />
  );
}
