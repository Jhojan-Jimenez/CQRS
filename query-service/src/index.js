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

async function main() {
  await db.connect();

  const port = parseInt(process.env.QUERY_PORT || '3002', 10);
  app.listen(port, () => console.log(`[query] listening on :${port}`));
}

main().catch((err) => {
  console.error('[query] fatal:', err);
  process.exit(1);
});
