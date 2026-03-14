/**
 * Balance Tables Migration Script
 * Run this to create balance tables in production
 * 
 * Usage: node scripts/migrate-balance-tables.js
 */

const { Pool } = require('pg');

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('Example: DATABASE_URL="postgresql://user:pass@host:5432/dbname"');
  process.exit(1);
}

async function runMigration() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  const client = await pool.connect();

  try {
    console.log('🚀 Starting balance tables migration...\n');

    // Check if tables exist
    const checkQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('organization_balances', 'balance_transactions')
    `;

    const { rows: existingTables } = await client.query(checkQuery);
    const tableNames = existingTables.map(r => r.table_name);

    console.log('📊 Current tables:', tableNames.length > 0 ? tableNames.join(', ') : 'None');

    // Create organization_balances table
    if (!tableNames.includes('organization_balances')) {
      console.log('\n📋 Creating organization_balances table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS organization_balances (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          total_earnings numeric(15,2) DEFAULT '0',
          available_balance numeric(15,2) DEFAULT '0',
          pending_balance numeric(15,2) DEFAULT '0',
          total_withdrawn numeric(15,2) DEFAULT '0',
          last_transaction_at timestamp with time zone,
          created_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now()
        )
      `);
      console.log('✅ organization_balances table created');
    } else {
      console.log('✅ organization_balances table already exists');
    }

    // Create balance_transactions table
    if (!tableNames.includes('balance_transactions')) {
      console.log('\n📋 Creating balance_transactions table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS balance_transactions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          order_id uuid,
          type varchar(50) NOT NULL,
          status varchar(50) NOT NULL DEFAULT 'pending',
          amount numeric(15,2) NOT NULL,
          fee_amount numeric(15,2) DEFAULT '0',
          net_amount numeric(15,2) NOT NULL,
          description text,
          reference_id varchar(255),
          created_at timestamp with time zone DEFAULT now(),
          completed_at timestamp with time zone
        )
      `);
      console.log('✅ balance_transactions table created');
    } else {
      console.log('✅ balance_transactions table already exists');
    }

    // Create indexes
    console.log('\n📊 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_organization_balances_org_id 
        ON organization_balances(organization_id);
      CREATE INDEX IF NOT EXISTS idx_balance_transactions_org_id 
        ON balance_transactions(organization_id);
      CREATE INDEX IF NOT EXISTS idx_balance_transactions_order_id 
        ON balance_transactions(order_id);
      CREATE INDEX IF NOT EXISTS idx_balance_transactions_type 
        ON balance_transactions(type);
      CREATE INDEX IF NOT EXISTS idx_balance_transactions_status 
        ON balance_transactions(status);
    `);
    console.log('✅ Indexes created');

    // Initialize balances for existing organizations
    console.log('\n🔄 Initializing balances for existing organizations...');
    const initResult = await client.query(`
      INSERT INTO organization_balances (organization_id, total_earnings, available_balance, pending_balance, total_withdrawn)
      SELECT id, '0', '0', '0', '0'
      FROM organizations
      WHERE id NOT IN (SELECT organization_id FROM organization_balances)
    `);
    console.log(`✅ Initialized ${initResult.rowCount} organization balances`);

    // Verify
    const verifyResult = await client.query(`
      SELECT 'organization_balances' as table_name, count(*) as row_count FROM organization_balances
      UNION ALL
      SELECT 'balance_transactions' as table_name, count(*) as row_count FROM balance_transactions
    `);

    console.log('\n📊 Migration Summary:');
    verifyResult.rows.forEach(row => {
      console.log(`   ${row.table_name}: ${row.row_count} rows`);
    });

    console.log('\n✅ Migration completed successfully!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration();
