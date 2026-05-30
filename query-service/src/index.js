const express = require('express');
const db = require('./postgres');

const app = express();

app.get('/products', async (_req, res) => {
  const products = await db.getAllProducts();
  res.json(products);
});

app.get('/products/:id', async (req, res) => {
  const product = await db.getProductById(req.params.id);
  if (!product) return res.status(404).json({ error: 'not found' });
  res.json(product);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', db: 'postgresql' });
});

const port = parseInt(process.env.QUERY_PORT || '3002', 10);
app.listen(port, () => console.log(`[query] listening on :${port}`));

db.connect().catch((err) => {
  console.error('[query] db init failed:', err.message);
  process.exit(1);
});
