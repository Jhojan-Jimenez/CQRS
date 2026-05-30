const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { connect, Product } = require('./mongo');
const synchronizer = require('./synchronizer');

const app = express();
app.use(express.json());

app.post('/products', async (req, res) => {
  const { name, price, stock } = req.body;

  if (!name || price == null || stock == null) {
    return res.status(400).json({ error: 'name, price, and stock are required' });
  }

  const product = new Product({
    _id: uuidv4(),
    name,
    price,
    stock,
    createdAt: new Date(),
    synced: false,
  });

  await product.save();

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'write',
    productId: product._id,
  }));

  return res.status(201).json(product);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', db: 'mongodb' });
});

async function main() {
  await connect();
  await synchronizer.start();

  const port = parseInt(process.env.COMMAND_PORT || '3001', 10);
  app.listen(port, () => console.log(`[command] listening on :${port}`));
}

main().catch((err) => {
  console.error('[command] fatal:', err);
  process.exit(1);
});
