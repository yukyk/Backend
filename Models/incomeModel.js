const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const incomeSchema = new Schema({
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    default: 'completed'
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'Signup',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Income', incomeSchema);