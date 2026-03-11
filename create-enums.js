require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace("?sslmode=disable", "") + "?sslmode=no-verify",
});

async function createEnums() {
  const client = await pool.connect();
  
  try {
    // Create missing ENUM types
    const enums = [
      `CREATE TYPE "coupon_type" AS ENUM('percentage', 'fixed')`,
      `CREATE TYPE "coupon_scope" AS ENUM('all', 'category', 'service')`,
      `CREATE TYPE "membership_tier" AS ENUM('bronze', 'silver', 'gold', 'platinum')`,
      `CREATE TYPE "withdrawal_status" AS ENUM('pending', 'processing', 'completed', 'rejected')`,
      `CREATE TYPE "transaction_fee_type" AS ENUM('flat', 'percentage')`,
    ];

    for (const sql of enums) {
      try {
        await client.query(sql);
        console.log('Created:', sql.split('"')[1]);
      } catch (err) {
        if (err.code === '42710') { // duplicate_object
          console.log('Already exists:', sql.split('"')[1]);
        } else {
          console.error('Error:', err.message);
        }
      }
    }

    console.log('\nAll ENUM types created or already exist!');
  } finally {
    client.release();
    await pool.end();
  }
}

createEnums().catch(console.error);
