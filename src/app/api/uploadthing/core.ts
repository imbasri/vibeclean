import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  // Profile images for users
  profileImage: f({
    image: { 
      maxFileSize: "512KB",
      maxFileCount: 1,
      minFileCount: 1,
    },
  })
    .onUploadComplete(async ({ file }) => {
      // File is automatically stored in vibeclean/profileImage folder
      return { 
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    }),

  // Organization/branch logos
  organizationLogo: f({
    image: { 
      maxFileSize: "512KB",
      maxFileCount: 1,
      minFileCount: 1,
    },
  })
    .onUploadComplete(async ({ file }) => {
      return { 
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    }),

  // General purpose uploads (documents, receipts, etc.)
  general: f({
    image: { 
      maxFileSize: "2MB",
      maxFileCount: 10,
    },
    pdf: { 
      maxFileSize: "4MB",
      maxFileCount: 5,
    },
  })
    .onUploadComplete(async ({ file }) => {
      return { 
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    }),

  // Product/service images
  serviceImage: f({
    image: { 
      maxFileSize: "1MB",
      maxFileCount: 5,
      minFileCount: 1,
    },
  })
    .onUploadComplete(async ({ file }) => {
      return { 
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    }),

  // Invoice and receipt uploads
  invoice: f({
    pdf: { 
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
    image: { 
      maxFileSize: "2MB",
      maxFileCount: 3,
    },
  })
    .onUploadComplete(async ({ file }) => {
      return { 
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    }),

  // Bulk uploads for reports and exports
  reports: f({
    pdf: { 
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
    text: { 
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
    blob: { 
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .onUploadComplete(async ({ file }) => {
      return { 
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
