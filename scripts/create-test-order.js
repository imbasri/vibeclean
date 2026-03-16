const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    // Get first branch
    const branchRes = await pool.query('SELECT id FROM branches LIMIT 1');
    if (branchRes.rows.length === 0) throw new Error('No branches found');
    const branchId = branchRes.rows[0].id;

    // Get first user
    const userRes = await pool.query('SELECT id FROM users LIMIT 1');
    if (userRes.rows.length === 0) throw new Error('No users found');
    const userId = userRes.rows[0].id;

    const orderNumber = 'TEST-' + Date.now();
    const id = require('crypto').randomUUID();

    await pool.query(
      `INSERT INTO orders (id, order_number, branch_id, created_by, status, payment_status, total, subtotal, discount, customer_name, customer_phone, estimated_completion_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [id, orderNumber, branchId, userId, 'pending', 'unpaid', '10000', '10000', '0', 'Test Customer', '08123456789', new Date(Date.now() + 86400000)]
    );

    console.log('CREATED_ORDER_ID:' + id);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}
main();
