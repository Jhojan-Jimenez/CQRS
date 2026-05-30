const { Pool } = require('pg');
const { Product } = require('./mongo');

let pgPool;

async function initPostgres() {
  pgPool = new Pool({ connectionString: process.env.POSTGRES_URL });

  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY,
      name VARCHAR(255),
      price NUMERIC,
      stock INTEGER,
      created_at TIMESTAMP,
      synced_at TIMESTAMP
    )
  `);

  console.log('[sync] postgres table ready');
}

async function syncOnce() {
  const unsynced = await Product.find({ synced: false });

  if (unsynced.length === 0) return;

  for (const doc of unsynced) {
    const now = new Date();
    const lagSeconds = ((now - doc.createdAt) / 1000).toFixed(1);

    await pgPool.query(
      `INSERT INTO products (id, name, price, stock, created_at, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET synced_at = $6`,
      [doc._id, doc.name, doc.price, doc.stock, doc.createdAt, now]
    );

    await Product.updateOne({ _id: doc._id }, { synced: true });

    console.log(JSON.stringify({
      timestamp: now.toISOString(),
      event: 'sync',
      productId: doc._id,
      lag_seconds: parseFloat(lagSeconds),
    }));
  }
}

async function start() {
  await initPostgres();

  const intervalMs = parseInt(process.env.SYNC_INTERVAL_MS || '15000', 10);

  setInterval(async () => {
    try {
      await syncOnce();
    } catch (err) {
      console.error('[sync] error:', err.message);
    }
  }, intervalMs);

  console.log(`[sync] synchronizer started — interval ${intervalMs}ms`);
}

module.exports = { start };
