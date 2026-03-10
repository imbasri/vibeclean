import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create the drizzle database instance with schema
export const db = drizzle(pool, { schema });

// Export the pool for direct access if needed
export { pool };

// Export all schema for easy access
export * from "./schema";
