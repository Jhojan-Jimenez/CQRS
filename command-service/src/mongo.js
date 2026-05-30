const mongoose = require('mongoose');

async function connect() {
  const url = process.env.MONGO_URL || 'mongodb://localhost:27017/cqrs_write';
  await mongoose.connect(url);
  console.log('[mongo] connected:', url);
}

const productSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  synced: { type: Boolean, default: false },
});

const Product = mongoose.model('Product', productSchema);

module.exports = { connect, Product };
