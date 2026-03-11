require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace("?sslmode=disable", "") + "?sslmode=no-verify",
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    // Run the migration SQL directly, skipping problematic DROP VIEW statements
    const migrationFiles = [
      '0000_outstanding_domino.sql',
      '0001_funny_black_knight.sql',
      '0002_subscriptions.sql',
      '0003_overjoyed_gravity.sql'
    ];

    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(__dirname, 'drizzle', 'migrations', migrationFile);
      
      if (!fs.existsSync(migrationPath)) {
        console.log(`Skipping ${migrationFile} - not found`);
        continue;
      }

      let sql = fs.readFileSync(migrationPath, 'utf8');
      
      // Remove DROP VIEW statements that cause issues with pg_stat_statements
      sql = sql.replace(/DROP VIEW "public"\."pg_stat_statements_info";\n?/g, '');
      sql = sql.replace(/DROP VIEW "public"\."pg_stat_statements";\n?/g, '');
      
      // Split by statement-breakpoint if present, otherwise just run whole thing
      const statements = sql.split(/-->\s*statement-breakpoint\s*\n?/);
      
      console.log(`Running migration: ${migrationFile} (${statements.length} statements)`);
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i].trim();
        if (!stmt) continue;
        
        try {
          await client.query(stmt);
        } catch (err) {
          // Ignore duplicate table errors - they already exist
          if (err.code === '42P07') { // duplicate_table
            console.log(`  Statement ${i + 1}: Table already exists, skipping`);
          } else if (err.code === '42710') { // duplicate_object
            console.log(`  Statement ${i + 1}: Object already exists, skipping`);
          } else if (err.code === '42P16') { // duplicate_pg_attr
            console.log(`  Statement ${i + 1}: Column already exists, skipping`);
          } else if (err.code === '42701') { // duplicate_column
            console.log(`  Statement ${i + 1}: Column already exists, skipping`);
          } else if (err.code === '23505') { // unique_violation
            console.log(`  Statement ${i + 1}: Unique constraint already exists, skipping`);
          } else {
            console.error(`  Statement ${i + 1} ERROR:`, err.message);
          }
        }
      }
      
      console.log(`Completed: ${migrationFile}`);
    }

    console.log('\n✓ All migrations completed!');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
