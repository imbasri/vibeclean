import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: (process.env.DATABASE_URL_SSL || process.env.DATABASE_URL)!.replace("?sslmode=disable", "") + "?sslmode=no-verify",
  },
  verbose: true,
  strict: true,
});
