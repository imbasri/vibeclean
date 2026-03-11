/**
 * Seed Add-on Products
 * 
 * Run this script to populate the addon_products table with default products
 * 
 * Usage:
 * npx tsx src/lib/db/seed-addons.ts
 */

import { db, addonProducts } from "./index";
import { eq } from "drizzle-orm";

const defaultProducts = [
  // Custom Domain
  {
    type: "custom_domain" as const,
    name: "Custom Domain",
    description: "Gunakan domain sendiri (contoh: laundryanda.com) untuk brand profesional",
    price: 299000,
    durationDays: 365,
    quota: null,
    isActive: true,
  },
  // WhatsApp Quota Packages
  {
    type: "whatsapp_quota" as const,
    name: "WhatsApp 100 Pesan",
    description: "Paket 100 pesan WhatsApp untuk notifikasi pelanggan",
    price: 25000,
    durationDays: 30,
    quota: 100,
    isActive: true,
  },
  {
    type: "whatsapp_quota" as const,
    name: "WhatsApp 500 Pesan",
    description: "Paket 500 pesan WhatsApp untuk notifikasi pelanggan",
    price: 100000,
    durationDays: 30,
    quota: 500,
    isActive: true,
  },
  {
    type: "whatsapp_quota" as const,
    name: "WhatsApp 1000 Pesan",
    description: "Paket 1000 pesan WhatsApp untuk notifikasi pelanggan",
    price: 175000,
    durationDays: 30,
    quota: 1000,
    isActive: true,
  },
];

async function seed() {
  console.log("🌱 Seeding add-on products...");

  for (const product of defaultProducts) {
    // Check if product already exists
    const existing = await db
      .select()
      .from(addonProducts)
      .where(eq(addonProducts.type, product.type))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(addonProducts)
        .set({
          name: product.name,
          description: product.description,
          price: product.price,
          durationDays: product.durationDays,
          quota: product.quota,
          isActive: product.isActive,
          updatedAt: new Date(),
        })
        .where(eq(addonProducts.id, existing[0].id));

      console.log(`  ✓ Updated: ${product.name}`);
    } else {
      // Insert new
      await db.insert(addonProducts).values(product);
      console.log(`  ✓ Created: ${product.name}`);
    }
  }

  console.log("✅ Seed completed!");
}

seed()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
