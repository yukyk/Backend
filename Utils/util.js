const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ DB connected');
  } catch (err) {
    console.log('❌ DB error:', err.message);
  }
};

module.exports = { mongoose, connectDB };