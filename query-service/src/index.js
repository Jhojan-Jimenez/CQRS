const express = require('express');
const db = require('./postgres');

const app = express();

app.get('/products', async (_req, res) => {
  try {
    const products = await db.getAllProducts();
    res.json(products);
  } catch (err) {
    res.status(503).json({ error: 'read store unavailable', detail: err.message });
  }
});

app.get('/products/:id', async (req, res) => {
  try {
    const product = await db.getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'not found' });
    res.json(product);
  } catch (err) {
    res.status(503).json({ error: 'read store unavailable', detail: err.message });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', db: 'postgresql' });
});

const port = parseInt(process.env.QUERY_PORT || '3002', 10);
app.listen(port, () => console.log(`[query] listening on :${port}`));

async function initWithRetry() {
  for (let attempt = 1; ; attempt++) {
    try {
      await db.connect();
      return;
    } catch (err) {
      console.error(`[query] postgres init failed (attempt ${attempt}):`, err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

initWithRetry();
