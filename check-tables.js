require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace("?sslmode=disable", "") + "?sslmode=no-verify",
});

async function checkTables() {
  const result = await pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' ORDER BY table_name');
  console.log('Tables in database:');
  result.rows.forEach(t => console.log(' -', t.table_name));
  console.log('\nTotal:', result.rows.length, 'tables');
  await pool.end();
}

checkTables().catch(console.error);
