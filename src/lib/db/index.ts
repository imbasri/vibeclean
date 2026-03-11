import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Use DATABASE_URL_SSL on Heroku (with SSL), fallback to DATABASE_URL locally
const connectionString = process.env.DATABASE_URL_SSL || process.env.DATABASE_URL;

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString,
});

// Create the drizzle database instance with schema
export const db = drizzle(pool, { schema });

// Export the pool for direct access if needed
export { pool };

// Export all schema for easy access
export * from "./schema";
