const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    const res = await pool.query('SELECT id, order_number, payment_status FROM orders ORDER BY created_at DESC LIMIT 5');
    res.rows.forEach(r => console.log(`ID: ${r.id}, Number: ${r.order_number}, Status: ${r.payment_status}`));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}
main();
