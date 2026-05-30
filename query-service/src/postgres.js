const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function connect() {
  // Verify connection and ensure table exists (created by synchronizer, but be defensive)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY,
      name VARCHAR(255),
      price NUMERIC,
      stock INTEGER,
      created_at TIMESTAMP,
      synced_at TIMESTAMP
    )
  `);
  console.log('[postgres] connected and table ready');
}

async function getAllProducts() {
  const result = await pool.query(
    'SELECT * FROM products ORDER BY created_at DESC'
  );
  return result.rows;
}

async function getProductById(id) {
  const result = await pool.query(
    'SELECT * FROM products WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { connect, getAllProducts, getProductById };
