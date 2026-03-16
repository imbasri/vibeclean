const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    const res = await pool.query('SELECT id, order_number, payment_status FROM orders ORDER BY created_at DESC LIMIT 5');
    console.log('Recent orders:', res.rows);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}
main();
