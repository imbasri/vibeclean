#!/usr/bin/env node

/**
 * Production Database Migration Script
 * Runs automatically during build/deployment
 * 
 * This script:
 * 1. Connects to production database
 * 2. Checks if QR code columns exist in branches table
 * 3. Adds missing columns with defaults
 * 4. Updates existing records
 */

const { Client } = require('pg');

async function runMigration() {
  console.log('🚀 Starting production database migration...');
  
  // Get database URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false // Required for Heroku PostgreSQL
    }
  });
  
  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');
    
    // Check and add QR code columns
    console.log('🔍 Checking branches table schema...');
    
    // Add qr_logo_url column
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'branches' AND column_name = 'qr_logo_url'
        ) THEN
          ALTER TABLE branches ADD COLUMN qr_logo_url TEXT DEFAULT '/logo_vibeclean.png';
          RAISE NOTICE 'Added qr_logo_url column';
        ELSE
          RAISE NOTICE 'qr_logo_url column already exists';
        END IF;
      END $$;
    `);
    
    // Add qr_color_dark column
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'branches' AND column_name = 'qr_color_dark'
        ) THEN
          ALTER TABLE branches ADD COLUMN qr_color_dark TEXT DEFAULT '#1e40af';
          RAISE NOTICE 'Added qr_color_dark column';
        ELSE
          RAISE NOTICE 'qr_color_dark column already exists';
        END IF;
      END $$;
    `);
    
    // Add qr_color_light column
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'branches' AND column_name = 'qr_color_light'
        ) THEN
          ALTER TABLE branches ADD COLUMN qr_color_light TEXT DEFAULT '#ffffff';
          RAISE NOTICE 'Added qr_color_light column';
        ELSE
          RAISE NOTICE 'qr_color_light column already exists';
        END IF;
      END $$;
    `);
    
    // Update existing branches with default values
    console.log('🔄 Updating existing branches with default values...');
    const updateResult = await client.query(`
      UPDATE branches 
      SET 
        qr_logo_url = COALESCE(qr_logo_url, '/logo_vibeclean.png'),
        qr_color_dark = COALESCE(qr_color_dark, '#1e40af'),
        qr_color_light = COALESCE(qr_color_light, '#ffffff')
      WHERE qr_logo_url IS NULL OR qr_color_dark IS NULL OR qr_color_light IS NULL
      RETURNING id;
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} existing branch(es)`);
    
    // Create index if not exists
    await client.query(`
      CREATE INDEX IF NOT EXISTS branches_organization_id_idx ON branches(organization_id);
    `);
    console.log('✅ Created index on branches.organization_id');
    
    // Verify migration
    const verifyResult = await client.query(`
      SELECT 
        COUNT(*) as total_branches,
        COUNT(qr_logo_url) as with_logo,
        COUNT(qr_color_dark) as with_colors
      FROM branches;
    `);
    
    console.log('📊 Migration verification:');
    console.log(`   Total branches: ${verifyResult.rows[0].total_branches}`);
    console.log(`   Branches with logo: ${verifyResult.rows[0].with_logo}`);
    console.log(`   Branches with colors: ${verifyResult.rows[0].with_colors}`);
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('👋 Database connection closed');
  }
}

// Run migration
runMigration();
