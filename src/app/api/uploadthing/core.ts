import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  profileImage: f({
    image: { maxFileSize: "512KB", maxFileCount: 1 },
  }).onUploadComplete(({ file }) => {
    return { url: file.ufsUrl };
  }),

  organizationLogo: f({
    image: { maxFileSize: "512KB", maxFileCount: 1 },
  }).onUploadComplete(({ file }) => {
    return { url: file.ufsUrl };
  }),

  general: f({
    image: { maxFileSize: "1MB", maxFileCount: 5 },
    pdf: { maxFileSize: "1MB", maxFileCount: 5 },
  }).onUploadComplete(({ file }) => {
    return { url: file.ufsUrl };
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
