require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL_SSL || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('sslmode') ? false : { rejectUnauthorized: false }
});

async function checkDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('=== ORGANIZATIONS ===');
    const orgs = await client.query('SELECT * FROM organizations');
    orgs.rows.forEach(o => console.log(o));

    console.log('\n=== SUBSCRIPTIONS ===');
    const subs = await client.query('SELECT * FROM subscriptions');
    subs.rows.forEach(s => console.log(s));

    console.log('\n=== USERS ===');
    const users = await client.query('SELECT id, email, name, created_at FROM users');
    users.rows.forEach(u => console.log(u));
    
  } finally {
    client.release();
    await pool.end();
  }
}

checkDatabase().catch(console.error);
