import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  profileImage: f({
    image: { maxFileSize: "512KB", maxFileCount: 1 },
  }).onUploadComplete(() => {
    return { url: "" };
  }),

  organizationLogo: f({
    image: { maxFileSize: "512KB", maxFileCount: 1 },
  }).onUploadComplete(() => {
    return { url: "" };
  }),

  general: f({
    image: { maxFileSize: "1MB", maxFileCount: 5 },
    pdf: { maxFileSize: "1MB", maxFileCount: 5 },
  }).onUploadComplete(() => {
    return { url: "" };
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
